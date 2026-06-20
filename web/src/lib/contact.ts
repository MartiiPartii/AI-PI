/**
 * Contact details for the screening phone line.
 *
 * The number is read from the environment on the server only (no `NEXT_PUBLIC_`
 * prefix), so it is rendered into the page's HTML — including the `tel:` links —
 * at request/build time. This keeps the value a single source of truth in the
 * env and means the call-to-action works without any client-side JavaScript.
 */

/** Raw E.164 number used for `tel:` links, e.g. "+359700XXXXX". */
const PHONE_E164 = process.env.PHONE_NUMBER ?? '+359700XXXXX';

/**
 * Human-friendly form shown in the UI. Falls back to the E.164 value when
 * `PHONE_NUMBER_DISPLAY` is not set.
 */
const PHONE_DISPLAY = process.env.PHONE_NUMBER_DISPLAY ?? PHONE_E164;

export interface PhoneLine {
  /** `href` value for a `tel:` anchor (digits and leading `+` only). */
  readonly tel: string;
  /** Pretty, spaced number to display to the caller. */
  readonly display: string;
}

/** Returns the screening line's dialable and display numbers. */
export function getPhoneLine(): PhoneLine {
  // Strip spacing/formatting characters for the dialable href.
  const tel = PHONE_E164.replace(/[^\d+]/g, '');
  return { tel, display: PHONE_DISPLAY };
}
