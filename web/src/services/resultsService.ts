import 'server-only';
import type { Result } from '@prisma/client';
import type { ResultDto } from '@/schemas/result';
import type { ResultSource } from '@/domain/risk';
import {
  findAccountByPhone,
} from '@/external/accounts';
import {
  deleteAllResultsForAccount,
  deleteResultForAccount,
  insertResult,
  listResultsByAccount,
} from '@/external/results';
import { toE164 } from '@/domain/phone';

/** Maps a DB row to the serializable DTO sent to the client.
 *
 * `createdAt` is wrapped in `new Date(...)` because values coming back through
 * `unstable_cache` are deserialized (a cache hit returns the date as a string,
 * a cache miss as a `Date`); this normalizes both to an ISO string. */
export function toResultDto(row: Result): ResultDto {
  return {
    id: row.id,
    riskPercent: row.riskPercent,
    elevated: row.elevated,
    source: (row.source === 'phone' ? 'phone' : 'web') satisfies ResultSource,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

/** Lists a single account's results as DTOs, newest first. */
export async function listForAccount(accountId: string): Promise<ResultDto[]> {
  const rows = await listResultsByAccount(accountId);
  return rows.map(toResultDto);
}

/** Deletes one of the account's results. Returns whether a row was removed
 *  (false if the id doesn't exist or belongs to another account). */
export function deleteForAccount(
  accountId: string,
  id: string,
): Promise<boolean> {
  return deleteResultForAccount(accountId, id);
}

/** Clears all of the account's results. Returns how many were removed. */
export function clearForAccount(accountId: string): Promise<number> {
  return deleteAllResultsForAccount(accountId);
}

/**
 * Persists a phone-line result, matching it to an account by phone number.
 * Persistence is gated on an account existing for that number (per AGENTS.md):
 * if none exists, nothing is written.
 *
 * @returns whether a result row was written (i.e. the number had an account).
 */
export async function ingestPhoneResult(input: {
  phone: string;
  riskPercent: number;
  elevated: boolean;
}): Promise<{ linked: boolean }> {
  const phone = toE164(input.phone);
  if (!phone) return { linked: false };

  const account = await findAccountByPhone(phone);
  if (!account) return { linked: false };

  await insertResult({
    accountId: account.id,
    riskPercent: input.riskPercent,
    elevated: input.elevated,
    source: 'phone',
  });
  return { linked: true };
}
