import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { IngestResultSchema } from '@/schemas/result';
import { getAuthenticatedAccountId } from '@/services/sessionService';
import { ingestPhoneResult, listForAccount } from '@/services/resultsService';

/**
 * /api/results
 *
 * GET  — the signed-in account's results, for the dashboard's polling. Scoped to
 *        the session account; never trusts a client-supplied id. The underlying
 *        read is cached per account (see external/results), so frequent polls
 *        are cheap and go fresh right after any write.
 *
 * POST — internal ingest used by the telephony service to persist a phone-line
 *        result. Authenticated with a shared secret (timing-safe compare); the
 *        result is linked to an account by phone, and dropped if none exists.
 */

export async function GET(): Promise<NextResponse> {
  const accountId = await getAuthenticatedAccountId();
  if (!accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const results = await listForAccount(accountId);
  return NextResponse.json({ results });
}

/** Constant-time comparison of the presented secret against the configured one. */
function secretMatches(presented: string | null): boolean {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected || !presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch; equalize by comparing only when
  // lengths match (a length difference is itself a non-match).
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!secretMatches(request.headers.get('x-internal-secret'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = IngestResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { linked } = await ingestPhoneResult(parsed.data);
  return NextResponse.json({ linked });
}
