/**
 * Generates a short beep tone in the exact audio format Twilio Media Streams
 * use (8 kHz, 8-bit G.711 μ-law), ready to be sent back to the caller.
 *
 * The beep is the "go" signal for the sustained-vowel ("ahhh") capture — the
 * same cue a caller hears on a normal answering machine before they start
 * speaking. We synthesise it ourselves rather than shipping an audio asset so
 * the tone, length, and format stay in code and need no transcoding.
 */

/** Twilio Media Streams sample rate. */
const SAMPLE_RATE_HZ = 8000;

/** Samples per Media Streams frame (20 ms at 8 kHz), matching Twilio's framing. */
const SAMPLES_PER_FRAME = 160;

/**
 * Encodes a single 16-bit PCM sample to 8-bit G.711 μ-law.
 *
 * Standard μ-law companding (μ = 255): sign bit + segment + mantissa, with the
 * conventional 0x84 bias and final bitwise inversion. This is the same encoding
 * Twilio sends/expects on the wire, so encoded frames play back without any
 * further conversion.
 */
function pcmToMuLaw(sample: number): number {
  const BIAS = 0x84;
  const CLIP = 32635;

  let sign = (sample >> 8) & 0x80;
  if (sign !== 0) {
    sample = -sample;
  }
  if (sample > CLIP) {
    sample = CLIP;
  }
  sample += BIAS;

  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; mask >>= 1) {
    exponent -= 1;
  }

  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  const muLawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;
  return muLawByte;
}

/**
 * Synthesises a beep and returns it as an array of base64-encoded μ-law frames,
 * each 20 ms long — the shape `media` messages carry on the Twilio websocket.
 *
 * @param frequencyHz tone pitch (default 1000 Hz — a clear, familiar phone beep)
 * @param durationMs  total beep length (default 500 ms)
 * @param amplitude   0..1 fraction of full scale (default 0.5, comfortable level)
 */
export function generateBeepFrames(
  frequencyHz = 1000,
  durationMs = 500,
  amplitude = 0.5,
): string[] {
  const totalSamples = Math.round((SAMPLE_RATE_HZ * durationMs) / 1000);
  const peak = Math.round(amplitude * 0x7fff);
  const frames: string[] = [];

  for (let start = 0; start < totalSamples; start += SAMPLES_PER_FRAME) {
    const frameLength = Math.min(SAMPLES_PER_FRAME, totalSamples - start);
    const frame = Buffer.allocUnsafe(frameLength);

    for (let i = 0; i < frameLength; i += 1) {
      const t = (start + i) / SAMPLE_RATE_HZ;
      const pcm = Math.round(peak * Math.sin(2 * Math.PI * frequencyHz * t));
      frame[i] = pcmToMuLaw(pcm);
    }

    frames.push(frame.toString('base64'));
  }

  return frames;
}
