/**
 * Helpers for decoding inbound G.711 μ-law audio (Twilio's wire format).
 *
 * Used by the phonation recording to convert the captured μ-law sample to
 * 16-bit linear PCM before scoring.
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
