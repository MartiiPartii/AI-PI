import type { Config } from '../config.js';

/**
 * Client for the AI model service (FastAPI) that scores a sustained-vowel
 * ("ahhh") phonation sample and returns a Parkinson's disease risk assessment.
 *
 * The real service does not exist yet, so this is a MOCK: it ignores the audio,
 * waits a realistic 1–2 seconds to imitate network + inference latency, and
 * returns a random risk percentage. The function signature and return shape are
 * the contract the real client will keep — when the FastAPI endpoint is ready,
 * only the body below changes (POST `config.fastApiUrl` with the audio), and
 * the rest of the telephony service stays untouched.
 */

/** Result of scoring a phonation sample. */
export interface RiskAssessment {
  /** Parkinson's disease risk as a percentage, 0–100. */
  readonly riskPercent: number;
}

/** Lower/upper bounds (ms) of the simulated model round-trip latency. */
const MOCK_MIN_DELAY_MS = 1000;
const MOCK_MAX_DELAY_MS = 2000;

/**
 * Sends a captured μ-law phonation sample to the model service for scoring.
 *
 * @param audio  raw G.711 μ-law audio captured during the call (8 kHz)
 * @param config runtime config (holds `fastApiUrl` for the real implementation)
 */
export async function scorePhonation(
  audio: Buffer,
  config: Config,
): Promise<RiskAssessment> {
  // TODO: replace this mock with a real call to the FastAPI model service:
  //   const res = await fetch(`${config.fastApiUrl}/score`, { method: 'POST', body: ... });
  //   return (await res.json()) as RiskAssessment;
  void config;

  const delayMs = MOCK_MIN_DELAY_MS + Math.random() * (MOCK_MAX_DELAY_MS - MOCK_MIN_DELAY_MS);
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const riskPercent = Math.round(Math.random() * 100);
  console.log(
    `[model] (mock) Scored ${audio.length}-byte phonation in ${Math.round(delayMs)}ms → risk ${riskPercent}%`,
  );

  return { riskPercent };
}
