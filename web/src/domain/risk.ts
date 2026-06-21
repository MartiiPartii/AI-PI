/**
 * Risk-result domain rules.
 *
 * The model returns only a probability; the *decision* (what counts as
 * "elevated") and how it is labelled belong to the app. The 0.38 threshold is
 * the same one the telephony service applies (MODEL_INTEGRATION.md) — kept here
 * so the web self-test and the phone line agree.
 */

/** Probability at/above which a result is flagged as elevated risk. */
export const RISK_THRESHOLD = 0.38;

/**
 * Decides whether a model probability (0..1) is elevated risk.
 * Mirrors the telephony service's app-side decision.
 */
export function isElevated(probability: number): boolean {
  return probability >= RISK_THRESHOLD;
}

/** Converts a probability (0..1) to a whole-percentage risk score (0..100). */
export function toRiskPercent(probability: number): number {
  return Math.round(probability * 100);
}

/** Bulgarian label for a result's risk level (default service language). */
export function riskLabel(elevated: boolean): string {
  return elevated ? 'Повишен риск' : 'Нисък риск';
}

/** Where an assessment was taken. */
export type ResultSource = 'phone' | 'web';

/** Bulgarian label for where a result came from. */
export function sourceLabel(source: ResultSource | string): string {
  return source === 'phone' ? 'По телефона' : 'През уебсайта';
}
