import type { Config } from '../config.js';

/**
 * Client for the AI model service (FastAPI) that scores a sustained-vowel
 * ("ahhh") phonation sample and returns a Parkinson's disease risk assessment.
 *
 * The captured audio is raw 8 kHz G.711 μ-law (Twilio's wire format); we POST it
 * verbatim to the model service, which decodes and scores it at its native rate.
 * The model returns ONLY a probability — the 0.38 decision threshold and the
 * spoken phrasing are the app's job (MODEL_INTEGRATION.md), so we apply the
 * threshold here and hand the agent a deterministic result to relay.
 */

/**
 * Decision threshold on the model's risk probability. risk ≥ this → elevated.
 * Tuned to favour recall (catch more true cases). Owned by the app, not the model.
 */
const RISK_THRESHOLD = 0.38;

/** Result of scoring a phonation sample, as handed to the agent to relay. */
export type RiskAssessment =
  | {
      /** A clear sample was scored. */
      readonly status: 'scored';
      /** Parkinson's risk as a percentage, 0–100. */
      readonly riskPercent: number;
      /** Whether the risk is at/above the decision threshold (app-side decision). */
      readonly elevated: boolean;
    }
  | {
      /** No clear pitch (silence/noise/not a sustained vowel) — ask the caller to retry. */
      readonly status: 'unclear';
    };

/** Shape returned by the FastAPI `/score` endpoint: probability 0..1, or null. */
interface ScoreResponse {
  readonly risk: number | null;
}

/**
 * Sends a captured μ-law phonation sample to the model service for scoring.
 *
 * @param audio  raw G.711 μ-law audio captured during the call (8 kHz)
 * @param config runtime config (holds `fastApiUrl`)
 * @throws if the model service is unreachable or returns a non-OK status, so the
 *         caller can fall back to a "try again" prompt.
 */
export async function scorePhonation(
  audio: Buffer,
  config: Config,
): Promise<RiskAssessment> {
  const res = await fetch(`${config.fastApiUrl}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    // Buffer is a Uint8Array; send the raw bytes as the request body.
    body: new Uint8Array(audio),
  });

  if (!res.ok) {
    throw new Error(`Model service responded ${res.status} ${res.statusText}`);
  }

  const { risk } = (await res.json()) as ScoreResponse;

  // null risk means the audio had no clear pitch — the agent re-explains and retries.
  if (risk === null) {
    console.log(`[model] Scored ${audio.length}-byte phonation → unclear (no pitch)`);
    return { status: 'unclear' };
  }

  const riskPercent = Math.round(risk * 100);
  const elevated = risk >= RISK_THRESHOLD;
  console.log(
    `[model] Scored ${audio.length}-byte phonation → risk ${riskPercent}% (elevated: ${elevated})`,
  );

  return { status: 'scored', riskPercent, elevated };
}
