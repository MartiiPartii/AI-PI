import type { Config } from '../config.js';
import { toE164 } from '../phone.js';

/**
 * Client for the website's internal results-ingest endpoint.
 *
 * After a call is scored, the telephony service does NOT write to the database
 * directly — it POSTs the result here, and the website (the sole DB owner)
 * links it to an account by phone number and stores it. Authenticated with a
 * shared secret header.
 *
 * Best-effort: like the result SMS, a failure is logged but never thrown, so a
 * persistence problem can't disrupt the live call.
 */

/** A scored phone-line result to persist for the caller (if they have an account). */
interface ResultPayload {
  readonly riskPercent: number;
  readonly elevated: boolean;
}

export async function postResult(
  config: Config,
  callerNumber: string | null,
  result: ResultPayload,
): Promise<void> {
  if (!config.webResultsUrl || !config.internalApiSecret) {
    console.warn('[results] Not configured (WEB_RESULTS_URL / INTERNAL_API_SECRET); skipping persist');
    return;
  }

  const phone = toE164(callerNumber);
  if (!phone) {
    console.warn(`[results] No valid caller number (${callerNumber ?? '(none)'}); skipping persist`);
    return;
  }

  try {
    const res = await fetch(config.webResultsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': config.internalApiSecret,
      },
      body: JSON.stringify({
        phone,
        riskPercent: result.riskPercent,
        elevated: result.elevated,
      }),
    });

    if (!res.ok) {
      console.error(`[results] Ingest responded ${res.status} ${res.statusText}`);
      return;
    }
    const json = (await res.json()) as { linked?: boolean };
    console.log(
      json.linked
        ? `[results] Result saved to account for ${phone}`
        : `[results] No account for ${phone}; nothing saved (SMS only)`,
    );
  } catch (error) {
    console.error('[results] Failed to POST result to website:', error);
  }
}
