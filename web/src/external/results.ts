import { unstable_cache, updateTag } from 'next/cache';
import type { Result } from '@prisma/client';
import { prisma } from './db';

/**
 * Assessment-result data-access, with short-lived per-account caching.
 *
 * The dashboard polls for results in near-real time, so the read is wrapped in
 * `unstable_cache` keyed per account with a short revalidate window: bursts of
 * polls within the window are served from cache (cheap, no DB hit), while new
 * results — a phone-line result POSTed by the telephony service or a web
 * self-test — appear within a few seconds. (A just-finished self-test is also
 * shown immediately in its own panel, independent of this list.)
 *
 * The TTL is set at/above the dashboard poll interval (~4s) so consecutive
 * polls — and concurrent tabs/users — are deduped against the database rather
 * than each one hitting it.
 */

/** Seconds a cached account list is reused before refreshing. */
const RESULTS_TTL_SECONDS = 5;

/** Cache tag for one account's results list; busted on delete (via `updateTag`,
 *  which gives read-your-own-writes) so a removed result doesn't flash back from
 *  the still-warm cache before the TTL expires. */
function resultsTag(accountId: string): string {
  return `results-by-account-${accountId}`;
}

/** Lists an account's results, newest first. Cached per account. */
export function listResultsByAccount(accountId: string): Promise<Result[]> {
  const cached = unstable_cache(
    () =>
      prisma.result.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
      }),
    ['results-by-account', accountId],
    { revalidate: RESULTS_TTL_SECONDS, tags: [resultsTag(accountId)] },
  );
  return cached();
}

/** Inserts a result row.
 *
 * Note: no cache bust here. Inserts arrive both from a Server Action (web
 * self-test) and a route handler (telephony POST); `updateTag` is Server-Action
 * only, so insertions rely on the short TTL plus the UI's optimistic add. */
export function insertResult(input: {
  accountId: string;
  riskPercent: number;
  elevated: boolean;
  source: 'phone' | 'web';
}): Promise<Result> {
  return prisma.result.create({ data: input });
}

/** Deletes a single result, scoped to its owning account so one user can never
 *  delete another's row. Returns whether a row was actually removed.
 *  Called only from a Server Action, so `updateTag` is valid here. */
export async function deleteResultForAccount(
  accountId: string,
  id: string,
): Promise<boolean> {
  const { count } = await prisma.result.deleteMany({ where: { id, accountId } });
  if (count > 0) updateTag(resultsTag(accountId));
  return count > 0;
}

/** Deletes all of an account's results. Returns how many rows were removed.
 *  Called only from a Server Action, so `updateTag` is valid here. */
export async function deleteAllResultsForAccount(
  accountId: string,
): Promise<number> {
  const { count } = await prisma.result.deleteMany({ where: { accountId } });
  if (count > 0) updateTag(resultsTag(accountId));
  return count;
}
