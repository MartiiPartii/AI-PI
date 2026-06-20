/**
 * Helpers for analysing inbound G.711 μ-law audio (Twilio's wire format).
 *
 * Used by the phonation capture to detect when the caller actually starts
 * saying "ahhh" so the fixed-length recording window can begin at voice onset
 * rather than at the beep — otherwise the caller's reaction time shows up as
 * leading silence and the held vowel gets clipped at the end.
 */

/**
 * Decodes a single 8-bit G.711 μ-law byte to a 16-bit linear PCM sample.
 * Inverse of the encoder in `beep.ts` (μ = 255, 0x84 bias).
 */
export function muLawToPcm(muLawByte: number): number {
  const BIAS = 0x84;
  const u = ~muLawByte & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = ((mantissa << 3) + BIAS) << exponent;
  sample -= BIAS;
  return sign ? -sample : sample;
}

/**
 * Root-mean-square amplitude of a μ-law audio frame, in linear PCM units
 * (0..~32635). Higher means louder; near-silence/line-noise sits low, while a
 * sustained vowel sits well above it — so a simple threshold separates them.
 */
export function frameRms(frame: Buffer): number {
  if (frame.length === 0) {
    return 0;
  }
  let sumSquares = 0;
  for (let i = 0; i < frame.length; i += 1) {
    const pcm = muLawToPcm(frame[i]);
    sumSquares += pcm * pcm;
  }
  return Math.sqrt(sumSquares / frame.length);
}
