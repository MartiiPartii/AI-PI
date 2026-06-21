import { unstable_cache } from 'next/cache';
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

/** Lists an account's results, newest first. Cached per account. */
export function listResultsByAccount(accountId: string): Promise<Result[]> {
  const cached = unstable_cache(
    () =>
      prisma.result.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
      }),
    ['results-by-account', accountId],
    { revalidate: RESULTS_TTL_SECONDS },
  );
  return cached();
}

/** Inserts a result row. */
export function insertResult(input: {
  accountId: string;
  riskPercent: number;
  elevated: boolean;
  source: 'phone' | 'web';
}): Promise<Result> {
  return prisma.result.create({ data: input });
}
