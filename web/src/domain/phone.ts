/**
 * Phone-number normalisation — the join key between the phone line and web
 * accounts.
 *
 * Accounts are keyed by phone number, and a result that arrives from the
 * telephony service is matched to an account purely by this value. If the two
 * services normalise differently, the match silently fails and results never
 * link. So normalisation lives here, in one place, and the telephony service
 * mirrors the same rule (E.164). Keep them in sync.
 *
 * Default region is Bulgaria (the service's default market) so callers can type
 * a national number ("0888 123 456") and still resolve to the same E.164 value
 * as an international one ("+359 888 123 456").
 */
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

/** Default region used when the input has no country code. */
const DEFAULT_REGION: CountryCode = 'BG';

/**
 * Normalises a raw phone string to E.164 (e.g. "+359888123456").
 *
 * @returns the E.164 string, or `null` when the input is not a valid number.
 */
export function toE164(raw: string): string | null {
  const parsed = parsePhoneNumberFromString(raw.trim(), DEFAULT_REGION);
  if (!parsed || !parsed.isValid()) {
    return null;
  }
  return parsed.number;
}
