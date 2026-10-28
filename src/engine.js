import sherpa from 'sherpa-onnx-node';
import { modelPaths } from './model.js';
import { wavToSamples } from './wav.js';

/**
 * One lazily created offline recognizer.
 *
 * GigaAM v3 ships as a NeMo CTC graph, so the recognizer only needs the model
 * and its token table; no VAD or punctuation model is involved.
 */
export class GigaAmEngine {
  constructor({ modelDir, threads = 2 }) {
    this.modelDir = modelDir;
    this.threads = threads;
    this.recognizer = null;
  }

  load() {
    if (this.recognizer) return this.recognizer;
    const paths = modelPaths(this.modelDir);
    this.recognizer = new sherpa.OfflineRecognizer({
      featConfig: { sampleRate: 16000, featureDim: 80 },
      modelConfig: {
        nemoCtc: { model: paths.model },
        tokens: paths.tokens,
        numThreads: this.threads,
        provider: 'cpu',
        debug: 0,
      },
    });
    return this.recognizer;
  }

  /**
   * Recognize one complete recording.
   * @param audio - RIFF/WAVE bytes from the speech seam.
   * @returns transcript with the timing the speech Remote expects.
   */
  transcribe(audio) {
    const { samples, sampleRate } = wavToSamples(audio);
    const recognizer = this.load();
    const stream = recognizer.createStream();
    stream.acceptWaveform({ samples, sampleRate });
    const started = Date.now();
    recognizer.decode(stream);
    const result = recognizer.getResult(stream);
    const inferenceSeconds = (Date.now() - started) / 1000;
    stream.free?.();
    return {
      text: String(result?.text ?? '').trim(),
      audioSeconds: samples.length / sampleRate,
      inferenceSeconds,
    };
  }

  dispose() {
    try {
      this.recognizer?.free?.();
    } catch {
      // The native handle may already be gone during shutdown.
    }
    this.recognizer = null;
  }
}

/**
 * Light punctuation for transcripts: capitalize, collapse spaces and finish the
 * sentence. GigaAM v3 emits bare words, and the chat input looks broken without it.
 */
export const tidy = (text) => {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const capitalized = clean.charAt(0).toLocaleUpperCase('ru-RU') + clean.slice(1);
  return /[.!?…]$/.test(capitalized) ? capitalized : `${capitalized}.`;
};
