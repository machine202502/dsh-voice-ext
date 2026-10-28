import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { apply } = await import('../index.js');

const registrations = [];
const disposers = [];
const ctx = {
  logger: { info() {}, warn() {} },
  effect(fn) {
    disposers.push(fn());
  },
  speechToText: {
    register(provider) {
      registrations.push(provider);
      return async () => {};
    },
    listProviders: () => registrations.map((provider) => provider.info),
    snapshot: () => ({ providers: [], selection: { providerId: 'hsb-voice-ext', language: 'ru' } }),
  },
  get: () => undefined,
};

const modelDir = join(process.env.LOCALAPPDATA ?? '.', 'hsb-voice-ext', 'models', 'gigaam-v3');
apply(ctx, { modelDir, autoDownload: false });

assert.equal(registrations.length, 1, 'provider must be registered once');
const provider = registrations[0];
assert.equal(provider.info.id, 'hsb-voice-ext');
assert.ok(provider.info.languages.includes('ru'), 'provider must advertise Russian');
assert.equal(provider.preparation.snapshot().phase, 'ready', 'fixture model must be present');

const wav = new Uint8Array(readFileSync(join(root, 'tests', 'fixtures', 'sample-ru-16k.wav')));
const transcript = await provider.transcribe({ audio: wav, language: 'ru' }, new AbortController().signal);
assert.equal(transcript.text, 'Вот мой голос меня же слышно хорошо.', `unexpected transcript: ${transcript.text}`);
assert.ok(transcript.audioSeconds > 5 && transcript.audioSeconds < 6, 'audioSeconds must reflect the recording');

await Promise.all(disposers.map((dispose) => dispose?.()));
console.log('PASS  provider registers, advertises ru and transcribes the sample');
