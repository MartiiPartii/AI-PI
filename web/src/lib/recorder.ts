/**
 * Browser microphone recorder that produces a mono 16-bit PCM WAV.
 *
 * The model service resamples to its native 8 kHz internally, so we record at
 * the device's native rate and let the server downsample — that keeps the
 * error-prone resampling out of the browser. Echo cancellation / noise
 * suppression / auto-gain are disabled because they distort the jitter/shimmer
 * the model measures.
 *
 * Client-only (uses Web Audio + getUserMedia).
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Merges captured Float32 chunks into one contiguous buffer. */
function merge(chunks: Float32Array[], length: number): Float32Array {
  const out = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Encodes mono Float32 PCM samples as a 16-bit PCM WAV blob. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  const dataSize = samples.length * 2;
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Records `durationMs` of microphone audio and returns it as a WAV blob.
 * Requests mic permission on first use; throws if denied/unavailable.
 */
export async function recordWav(durationMs: number): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AudioCtx();

  try {
    // A new AudioContext can start suspended; resume it (allowed here because
    // recording is triggered by a user click) or no audio frames are captured.
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    // Route through a muted gain node so capture runs without echoing to speakers.
    const mute = ctx.createGain();
    mute.gain.value = 0;

    const chunks: Float32Array[] = [];
    let length = 0;
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      chunks.push(copy);
      length += copy.length;
    };

    source.connect(processor);
    processor.connect(mute);
    mute.connect(ctx.destination);

    await sleep(durationMs);

    processor.onaudioprocess = null;
    source.disconnect();
    processor.disconnect();
    mute.disconnect();

    return encodeWav(merge(chunks, length), ctx.sampleRate);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    await ctx.close();
  }
}
