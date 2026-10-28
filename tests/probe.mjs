import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GigaAmEngine, tidy } from '../src/engine.js';
import { DEFAULT_MODEL_DIR, ensureModel, modelPresent } from '../src/model.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataRoot = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'dsh-voice-ext')
  : join(process.env.HOME ?? process.env.USERPROFILE ?? '.', '.dsh-voice-ext');
const modelDir = process.env.DSH_VOICE_MODEL_DIR || DEFAULT_MODEL_DIR(dataRoot);

if (!modelPresent(modelDir)) {
  console.log(`downloading model into ${modelDir} …`);
  await ensureModel({
    modelDir,
    onProgress: (file, done, total) => {
      if (done % (32 * 1024 * 1024) < 1024 * 1024) {
        console.log(`  ${file}: ${(done / 1024 / 1024).toFixed(0)}/${(total / 1024 / 1024).toFixed(0)} MB`);
      }
    },
  });
}

const engine = new GigaAmEngine({ modelDir, threads: 2 });
const wav = readFileSync(join(root, 'tests', 'fixtures', 'sample-ru-16k.wav'));
const started = Date.now();
const transcript = engine.transcribe(wav);
console.log(`raw: ${transcript.text}`);
console.log(`tidy: ${tidy(transcript.text)}`);
console.log(`audio: ${transcript.audioSeconds.toFixed(2)} s`);
console.log(`elapsed: ${Date.now() - started} ms`);
engine.dispose();
