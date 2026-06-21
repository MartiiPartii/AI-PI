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
 * Banded risk level the agent relays, instead of a single elevated/not flag.
 * The middle "slightly_elevated" band is deliberately hedged: a phone call can
 * distort the voice enough to nudge a healthy speaker into the 40–60% range, so
 * it is treated as borderline, not a confident positive. Owned by the app, not
 * the model. Cutoffs are on the risk fraction (0..1).
 */
export type RiskLevel = 'low' | 'slightly_elevated' | 'elevated' | 'high';

const RISK_BANDS: ReadonlyArray<{ readonly max: number; readonly level: RiskLevel }> = [
  { max: 0.4, level: 'low' },
  { max: 0.6, level: 'slightly_elevated' },
  { max: 0.8, level: 'elevated' },
  { max: Infinity, level: 'high' },
];

/** Maps a 0..1 risk probability to its band. */
function riskLevel(risk: number): RiskLevel {
  return RISK_BANDS.find((band) => risk < band.max)!.level;
}

/** Result of scoring a phonation sample, as handed to the agent to relay. */
export type RiskAssessment =
  | {
      /** A clear sample was scored. */
      readonly status: 'scored';
      /** Parkinson's risk as a percentage, 0–100. */
      readonly riskPercent: number;
      /** Banded risk level the agent uses to decide what to say. */
      readonly level: RiskLevel;
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
  const level = riskLevel(risk);
  console.log(
    `[model] Scored ${audio.length}-byte phonation → risk ${riskPercent}% (${level})`,
  );

  return { status: 'scored', riskPercent, level };
}
