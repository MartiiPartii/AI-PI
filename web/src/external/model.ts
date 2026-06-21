/**
 * Client for the FastAPI model service (the AI risk scorer).
 *
 * Called server-side only — the model service is never exposed to the browser.
 * The web self-test records a WAV in the browser, uploads it to a Server Action,
 * and the service layer forwards the bytes here. The model downsamples to its
 * native 8 kHz internally, so a browser-rate WAV is fine.
 */

const FASTAPI_URL = process.env.FASTAPI_URL ?? 'http://localhost:8000';

/** Outcome of scoring: a probability 0..1, or `null` when no clear pitch. */
export type ScoreResult = { risk: number | null };

/**
 * Scores a WAV phonation sample via the model service's `/score-wav` endpoint.
 *
 * @param wav   raw WAV file bytes (any sample rate; model resamples to 8 kHz)
 * @throws if the model service is unreachable or returns a non-OK status.
 */
export async function scoreWav(wav: ArrayBuffer): Promise<ScoreResult> {
  const form = new FormData();
  form.append('file', new Blob([wav], { type: 'audio/wav' }), 'sample.wav');

  const res = await fetch(`${FASTAPI_URL}/score-wav`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Model service responded ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { risk?: number | null };
  return { risk: json.risk ?? null };
}
