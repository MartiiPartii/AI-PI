import 'server-only';
import type { ResultDto } from '@/schemas/result';
import { scoreWav } from '@/external/model';
import { insertResult } from '@/external/results';
import { isElevated, toRiskPercent } from '@/domain/risk';
import { toResultDto } from './resultsService';

/**
 * Web self-test use-case: score a recorded WAV and persist the result for the
 * signed-in account.
 *
 * The account id always comes from the session (never the client). The model
 * decides only the probability; the app applies the 0.38 threshold (domain) —
 * the same decision the phone line makes. On success the stored result is
 * returned as a DTO so the UI can show it immediately and insert it into the
 * list without waiting for the next poll.
 */
export type AssessOutcome =
  | { status: 'scored'; result: ResultDto }
  | { status: 'unclear' };

export async function assess(
  accountId: string,
  wav: ArrayBuffer,
): Promise<AssessOutcome> {
  const { risk } = await scoreWav(wav);

  // No clear pitch (silence/noise/not a sustained vowel): nothing is stored,
  // the UI asks the caller to try again.
  if (risk === null) {
    return { status: 'unclear' };
  }

  const row = await insertResult({
    accountId,
    riskPercent: toRiskPercent(risk),
    elevated: isElevated(risk),
    source: 'web',
  });
  return { status: 'scored', result: toResultDto(row) };
}
