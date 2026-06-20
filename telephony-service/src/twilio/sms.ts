import twilio from 'twilio';
import type { Config } from '../config.js';
import type { RiskAssessment } from '../model/risk-client.js';

/** The scored variant of a risk assessment — the only kind that yields an SMS. */
type ScoredAssessment = Extract<RiskAssessment, { status: 'scored' }>;

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
 * Trial-account SMS sizing (Twilio error 30044 — Trial Message Length Exceeded).
 *
 * Our message is Bulgarian (Cyrillic), which forces UCS-2 encoding: only 70
 * characters fit in a single SMS segment. On top of that, Twilio prepends a
 * notice ("Sent from a Twilio trial account - ", ~35 chars) to every trial SMS,
 * and that counts toward the segment limit. Trial accounts reject messages that
 * span too many segments, so on trial we keep the WHOLE message (prefix + body)
 * within one UCS-2 segment by capping the body to (70 - 35) characters.
 *
 * These limits are a trial-only artefact; upgraded/production accounts have no
 * prefix and allow long, multi-segment messages, so the full message is sent there.
 */
const UCS2_SEGMENT_CHARS = 70;
const TRIAL_PREFIX_CHARS = 35;
const TRIAL_MAX_BODY_CHARS = UCS2_SEGMENT_CHARS - TRIAL_PREFIX_CHARS;

/**
 * Composes the full result message. Written in Bulgarian — the service's default
 * language (see AGENTS.md) — so the SMS is consistent regardless of which
 * language the spoken call switched to.
 */
function buildResultMessage(assessment: ScoredAssessment): string {
  const base = `AI-PI резултат: вашият риск от Паркинсон е ${assessment.riskPercent}%. Това е само предварителен скрининг, а не медицинска диагноза.`;
  const advice =
    assessment.riskPercent >= RISK_RECOMMENDATION_THRESHOLD
      ? ' Препоръчваме да се консултирате с лекар.'
      : ' Грижете се за здравето си и при притеснения се консултирайте с лекар.';
  return base + advice;
}

/**
 * Composes a compact result message that fits in a single UCS-2 segment once
 * Twilio's trial prefix is added, so trial accounts don't reject it (30044).
 * Keeps the essentials: risk percentage and the "screening, not diagnosis" framing.
 */
function buildTrialResultMessage(assessment: ScoredAssessment): string {
  const body = `AI-PI риск: ${assessment.riskPercent}%. Само скрининг.`;
  // Safety net: if a future edit lengthens this, hard-cap it so we never
  // re-trip 30044. Trimming on a UTF-16 code-unit boundary is fine here — the
  // Cyrillic letters used are all single code units.
  return body.length > TRIAL_MAX_BODY_CHARS ? body.slice(0, TRIAL_MAX_BODY_CHARS) : body;
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
  assessment: ScoredAssessment,
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
    const body = config.twilioTrialAccount
      ? buildTrialResultMessage(assessment)
      : buildResultMessage(assessment);
    const message = await rest.messages.create({ to, from, body });
    console.log(`[sms] Result SMS sent to ${to} (sid: ${message.sid})`);
  } catch (error) {
    console.error(`[sms] Failed to send result SMS to ${to}:`, error);
  }
}
