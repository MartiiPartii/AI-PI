import twilio from 'twilio';
import type { Config } from '../config.js';
import type { RiskAssessment } from '../model/risk-client.js';

/**
 * Sends the post-assessment result SMS to the caller via the Twilio REST API.
 *
 * This is the written half of result delivery (the spoken half is handled in
 * the call by the agent). Best-effort: a failure here is logged but never
 * thrown, so an SMS problem can't disrupt the live call.
 */

/**
 * Risk percentage at or above which the message recommends seeing a doctor.
 * Kept in sync with how the agent is told to phrase the spoken result.
 */
const RISK_RECOMMENDATION_THRESHOLD = 50;

/**
 * Composes the result message. Written in Bulgarian — the service's default
 * language (see AGENTS.md) — so the SMS is consistent regardless of which
 * language the spoken call switched to.
 */
function buildResultMessage(assessment: RiskAssessment): string {
  const base = `AI-PI резултат: вашият риск от Паркинсон е ${assessment.riskPercent}%. Това е само предварителен скрининг, а не медицинска диагноза.`;
  const advice =
    assessment.riskPercent >= RISK_RECOMMENDATION_THRESHOLD
      ? ' Препоръчваме да се консултирате с лекар.'
      : ' Грижете се за здравето си и при притеснения се консултирайте с лекар.';
  return base + advice;
}

/**
 * Texts the caller their assessment result.
 *
 * @param config       runtime config (Twilio credentials, optional SMS sender)
 * @param assessment   the risk result to communicate
 * @param to           caller's phone number (E.164)
 * @param fromFallback number the caller dialled, used as the SMS sender if no
 *                     dedicated `TWILIO_SMS_FROM` is configured
 */
export async function sendResultSms(
  config: Config,
  assessment: RiskAssessment,
  to: string | null,
  fromFallback: string | null,
): Promise<void> {
  const from = config.smsFromNumber || fromFallback;

  if (!to || !from) {
    console.warn(
      `[sms] Cannot send result SMS (missing ${!to ? 'caller number' : 'sender number'}); skipping`,
    );
    return;
  }
  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    console.warn('[sms] Cannot send result SMS (missing Twilio credentials); skipping');
    return;
  }

  try {
    const rest = twilio(config.twilioAccountSid, config.twilioAuthToken);
    const message = await rest.messages.create({ to, from, body: buildResultMessage(assessment) });
    console.log(`[sms] Result SMS sent to ${to} (sid: ${message.sid})`);
  } catch (error) {
    console.error(`[sms] Failed to send result SMS to ${to}:`, error);
  }
}
