import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const KEYS = {
  modelDir: 'string',
  threads: 'number',
  autoDownload: 'boolean',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Keep known keys with sane values; anything else is dropped. */
export function sanitize(input = {}) {
  const out = {};
  const modelDir = input?.modelDir;
  if (typeof modelDir === 'string' && modelDir.trim()) out.modelDir = modelDir.trim();
  const threads = Number(input?.threads);
  if (Number.isFinite(threads)) out.threads = clamp(Math.round(threads), 1, 16);
  if (typeof input?.autoDownload === 'boolean') out.autoDownload = input.autoDownload;
  return out;
}

export function createSettingsStore(dataRoot) {
  const file = join(dataRoot, 'settings.json');
  const read = () => {
    try {
      return existsSync(file) ? sanitize(JSON.parse(readFileSync(file, 'utf8'))) : {};
    } catch {
      return {};
    }
  };
  const write = (patch) => {
    const next = sanitize({ ...read(), ...patch });
    try {
      mkdirSync(dataRoot, { recursive: true });
      writeFileSync(file, JSON.stringify(next, null, 2));
    } catch {
      // A failed write keeps the previous values.
    }
    return next;
  };
  return { file, read, write };
}
