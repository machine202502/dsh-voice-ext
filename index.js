import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createServer } from 'node:http';
import { GigaAmEngine, tidy } from './src/engine.js';
import { DEFAULT_MODEL_DIR, ensureModel, modelPresent } from './src/model.js';
import { createSettingsStore } from './src/settings.js';

export const name = 'hsb-voice-ext';
export const inject = ['speechToText'];

const dataRoot = () => {
  const base = process.env.LOCALAPPDATA
    || (process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support') : join(homedir(), '.local', 'share'));
  return join(base, 'hsb-voice-ext');
};

const modelSize = (dir) => {
  try {
    return statSync(join(dir, 'model.int8.onnx')).size;
  } catch {
    return 0;
  }
};

/**
 * Local Russian speech provider.
 *
 * The built-in Voice input keeps its microphone and recording flow; this plugin
 * only adds a recognizer, so the UI does not need to change.
 */
export function apply(ctx, config = {}) {
  const providerId = config.providerId || 'hsb-voice-ext';
  const root = dataRoot();
  const store = createSettingsStore(root);
  const engineDefaults = () => ({
    modelDir: config.modelDir || DEFAULT_MODEL_DIR(root),
    threads: Number.isFinite(config.threads) ? Number(config.threads) : 2,
    autoDownload: config.autoDownload !== false,
  });
  const effective = () => ({ ...engineDefaults(), ...store.read() });

  let engine = null;
  let engineKey = '';

  const ensureEngine = () => {
    const settings = effective();
    const key = `${settings.modelDir}|${settings.threads}`;
    if (!engine || engineKey !== key) {
      engine?.dispose();
      engine = new GigaAmEngine({ modelDir: settings.modelDir, threads: settings.threads });
      engineKey = key;
    }
    return engine;
  };

  const listeners = new Set();
  let state = modelPresent(effective().modelDir) ? { phase: 'ready' } : { phase: 'unprepared' };
  let running = null;

  const publish = (next) => {
    state = next;
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // A broken observer must not stop preparation.
      }
    }
  };

  const install = async () => {
    const settings = effective();
    if (modelPresent(settings.modelDir)) {
      publish({ phase: 'ready' });
      return;
    }
    publish({ phase: 'downloading', resource: 'gigaam-v3', completedBytes: 0 });
    let last = 0;
    try {
      await ensureModel({
        modelDir: settings.modelDir,
        onProgress: (file, done, total) => {
          if (done - last < 4 * 1024 * 1024) return;
          last = done;
          publish({ phase: 'downloading', resource: file, completedBytes: done, totalBytes: total || undefined });
        },
      });
      publish({ phase: 'ready' });
      ctx.logger?.info?.(`hsb-voice-ext: model ready at ${settings.modelDir}`);
    } catch (error) {
      publish({ phase: 'unprepared' });
      ctx.logger?.warn?.(`hsb-voice-ext: model download failed: ${error?.message ?? error}`);
      throw error;
    }
  };

  const preparation = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot() {
      return state;
    },
    async prepare() {
      if (running) return running;
      running = install().finally(() => {
        running = null;
      });
      return running;
    },
    async cancel() {
      // Downloads are short and idempotent; cancelling simply drops the wait.
    },
  };

  const status = () => {
    const settings = effective();
    let selection = null;
    try {
      selection = ctx.speechToText.snapshot?.()?.selection ?? null;
    } catch {
      // The seam may be missing during shutdown.
    }
    return {
      providerId,
      modelDir: settings.modelDir,
      threads: settings.threads,
      autoDownload: settings.autoDownload,
      installed: modelPresent(settings.modelDir),
      bytes: modelSize(settings.modelDir),
      phase: state.phase,
      selection,
      file: store.file,
    };
  };

  const bridgePort = Number.isFinite(config.bridgePort) ? Number(config.bridgePort) : 49234;

  const startBridge = () => new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const send = (code, body) => {
        res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(body));
      };
      if (req.method === 'GET' && url.pathname === '/status') {
        send(200, status());
        return;
      }
      if (req.method === 'POST' && url.pathname === '/settings') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 8192) req.destroy();
        });
        req.on('end', () => {
          try {
            const saved = store.write(body ? JSON.parse(body) : {});
            const settings = effective();
            publish(modelPresent(settings.modelDir) ? { phase: 'ready' } : { phase: 'unprepared' });
            if (settings.autoDownload && !modelPresent(settings.modelDir)) void preparation.prepare().catch(() => {});
            send(200, { ok: true, saved, ...status() });
          } catch (error) {
            send(400, { ok: false, error: String(error?.message ?? error) });
          }
        });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/prepare') {
        preparation.prepare().then(
          () => send(200, status()),
          (error) => send(500, { ok: false, error: String(error?.message ?? error) }),
        );
        return;
      }
      send(404, { ok: false, error: 'not found' });
    });
    server.once('error', () => resolve(null));
    server.listen(bridgePort, '127.0.0.1', () => resolve(server));
  });

  let bridgeTask = null;
  ctx.effect(() => {
    const unregister = ctx.speechToText.register({
      info: {
        id: providerId,
        name: 'GigaAM v3 (Russian, local)',
        location: 'host-local',
        languages: ['ru', 'auto'],
        setupEstimate: {
          recommendedDiskBytes: 260 * 1024 * 1024,
          expectedMemoryBytes: 900 * 1024 * 1024,
          minimumMinutes: 1,
          maximumMinutes: 10,
        },
      },
      preparation,
      async transcribe(input, signal) {
        signal?.throwIfAborted?.();
        const settings = effective();
        if (!modelPresent(settings.modelDir)) {
          throw new Error('GigaAM v3 model is not installed yet; open Plugins → Voice ext and install it');
        }
        const text = ensureEngine().transcribe(input.audio);
        return tidy(text);
      },
    });
    ctx.logger?.info?.(`hsb-voice-ext: provider ${providerId} registered (${effective().modelDir})`);

    if (effective().autoDownload && !modelPresent(effective().modelDir)) {
      void preparation.prepare().catch(() => {});
    }

    bridgeTask = startBridge();

    // Diagnostic: run one recording through the shared seam so an install can be
    // verified without speaking into the microphone.
    if (typeof config.selfTest === 'string' && config.selfTest) {
      void (async () => {
        const result = { at: new Date().toISOString(), providerId, language: config.language ?? 'ru', wav: config.selfTest };
        try {
          result.providers = ctx.speechToText.listProviders?.().map((entry) => entry.id);
          result.selection = ctx.speechToText.snapshot?.()?.selection;
        } catch {
          // Diagnostics stay best effort.
        }
        try {
          await preparation.prepare();
          const audio = new Uint8Array(readFileSync(config.selfTest));
          const spec = ctx.speechToText.resolve({ audio, providerId, language: config.language ?? 'ru' });
          result.text = await ctx.speechToText.transcribe(spec, AbortSignal.timeout(120_000));
          result.ok = true;
        } catch (error) {
          result.ok = false;
          result.error = String(error?.message ?? error);
        }
        try {
          mkdirSync(root, { recursive: true });
          writeFileSync(join(root, 'selftest.json'), JSON.stringify(result, null, 2));
        } catch {
          // Diagnostics must not break activation.
        }
      })();
    }

    return async () => {
      const removing = unregister();
      const server = await bridgeTask;
      server?.close?.();
      bridgeTask = null;
      engine?.dispose();
      engine = null;
      await removing;
    };
  });
}
