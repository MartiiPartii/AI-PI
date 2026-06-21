import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

/**
 * Phone-number normalisation to E.164.
 *
 * This MUST stay in sync with the website's `domain/phone.ts`: the phone number
 * is the join key that links a phone-line result to a web account. If the two
 * services normalise differently, the website can't match the number to an
 * account and the result is silently dropped. Same default region (Bulgaria).
 */
const DEFAULT_REGION: CountryCode = 'BG';

/** Returns the E.164 form (e.g. "+359888123456"), or `null` if invalid. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw.trim(), DEFAULT_REGION);
  if (!parsed || !parsed.isValid()) {
    return null;
  }
  return parsed.number;
}
