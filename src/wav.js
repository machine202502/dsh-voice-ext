/**
 * Minimal RIFF/WAVE reader: the speech seam hands over a complete WAV file and
 * sherpa-onnx wants 16 kHz mono float samples.
 */

const readString = (view, offset, length) => {
  let out = '';
  for (let i = 0; i < length; i += 1) out += String.fromCharCode(view.getUint8(offset + i));
  return out;
};

/** Linear resampling is enough for speech at these ratios. */
const resample = (samples, from, to) => {
  if (from === to) return samples;
  const ratio = to / from;
  const length = Math.max(1, Math.round(samples.length * ratio));
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = i / ratio;
    const index = Math.floor(position);
    const fraction = position - index;
    const a = samples[index] ?? 0;
    const b = samples[index + 1] ?? a;
    out[i] = a + (b - a) * fraction;
  }
  return out;
};

const pcm16ToFloat = (view, offset, length) => {
  const count = Math.floor(length / 2);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i += 1) out[i] = view.getInt16(offset + i * 2, true) / 32768;
  return out;
};

const pcmFloatToMono = (view, offset, length) => {
  const count = Math.floor(length / 4);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i += 1) out[i] = view.getFloat32(offset + i * 4, true);
  return out;
};

/**
 * Decode a WAV buffer into 16 kHz mono float samples.
 * @param audio - complete RIFF/WAVE bytes.
 * @returns float samples ready for the recognizer.
 */
export function wavToSamples(audio) {
  const bytes = audio instanceof Uint8Array ? audio : new Uint8Array(audio);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 44 || readString(view, 0, 4) !== 'RIFF' || readString(view, 8, 4) !== 'WAVE') {
    throw new Error('recording is not a RIFF/WAVE file');
  }
  let offset = 12;
  let format = null;
  let data = null;
  while (offset + 8 <= bytes.byteLength) {
    const id = readString(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = {
        encoding: view.getUint16(body, true),
        channels: view.getUint16(body + 2, true),
        rate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      };
    } else if (id === 'data') {
      data = { offset: body, size: Math.min(size, bytes.byteLength - body) };
    }
    offset = body + size + (size % 2);
  }
  if (!format || !data) throw new Error('recording has no fmt or data chunk');
  if (format.channels < 1) throw new Error('recording has no channels');
  const samples = format.encoding === 3
    ? pcmFloatToMono(view, data.offset, data.size)
    : pcm16ToFloat(view, data.offset, data.size);
  const mono = format.channels === 1 ? samples : averageChannels(samples, format.channels);
  return { samples: resample(mono, format.rate, 16000), sampleRate: 16000 };
}

const averageChannels = (samples, channels) => {
  const frames = Math.floor(samples.length / channels);
  const out = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) sum += samples[frame * channels + channel];
    out[frame] = sum / channels;
  }
  return out;
};
