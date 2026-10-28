import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

/**
 * GigaAM v3 CTC converted to ONNX by the sherpa-onnx project (MIT).
 * The model is Russian-only; `tokens.txt` is its byte-level vocabulary.
 */
const SOURCE = 'https://huggingface.co/csukuangfj/sherpa-onnx-nemo-ctc-giga-am-v3-russian-2025-12-16/resolve/main';

export const DEFAULT_FILES = [
  { name: 'model.int8.onnx', bytes: 224721476, sha256: 'f86ebfa0429ced91be6054fc344827e9c6c2572f3c318416cd974b06f66437ec' },
  { name: 'tokens.txt', bytes: 196, sha256: null },
];

export const DEFAULT_MODEL_DIR = (dataRoot) => join(dataRoot, 'models', 'gigaam-v3');

export const modelPaths = (modelDir) => ({
  model: join(modelDir, 'model.int8.onnx'),
  tokens: join(modelDir, 'tokens.txt'),
});

const digest = async (file) => {
  const hash = createHash('sha256');
  await pipeline(createReadStream(file), hash);
  return hash.digest('hex');
};

const download = async (url, target, expected, onProgress) => {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`download failed: HTTP ${response.status}`);
  const total = Number(response.headers.get('content-length')) || expected?.bytes || 0;
  let completed = 0;
  const body = Readable.fromWeb(response.body);
  body.on('data', (chunk) => {
    completed += chunk.length;
    onProgress?.(completed, total);
  });
  const partial = `${target}.part`;
  await pipeline(body, createWriteStream(partial));
  if (expected?.bytes && statSync(partial).size !== expected.bytes) {
    rmSync(partial, { force: true });
    throw new Error(`download is incomplete: ${statSync(partial).size ?? 0}/${expected.bytes} bytes`);
  }
  renameSync(partial, target);
  return completed;
};

/**
 * Ensure every model file exists and matches its pinned hash.
 * @param options - model directory, file list and progress callback.
 * @returns resolved model paths.
 */
export async function ensureModel({ modelDir, files = DEFAULT_FILES, onProgress } = {}) {
  mkdirSync(modelDir, { recursive: true });
  for (const file of files) {
    const target = join(modelDir, file.name);
    let ok = existsSync(target);
    if (ok && file.bytes) ok = statSync(target).size === file.bytes;
    if (ok && file.sha256) ok = (await digest(target)) === file.sha256;
    if (ok) continue;
    rmSync(target, { force: true });
    await download(`${SOURCE}/${file.name}`, target, file, (done, total) => onProgress?.(file.name, done, total));
    if (file.sha256) {
      const actual = await digest(target);
      if (actual !== file.sha256) {
        rmSync(target, { force: true });
        throw new Error(`${file.name} failed verification`);
      }
    }
  }
  return modelPaths(modelDir);
}

/** True when every file is present with the expected size. */
export const modelPresent = (modelDir, files = DEFAULT_FILES) =>
  files.every((file) => {
    const target = join(modelDir, file.name);
    return existsSync(target) && (!file.bytes || statSync(target).size === file.bytes);
  });
