import 'server-only';
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
} from '@/lib/session-token';
import { findAccountById } from '@/external/accounts';

/**
 * Session use-cases for Server Actions / route handlers / Server Components.
 *
 * The session is a signed, httpOnly cookie holding only the account id — no
 * sensitive data, and the client can neither read nor forge it. Authorization
 * is always derived from this cookie server-side; an account id is never
 * accepted from the client.
 */

/** Issues a session cookie for the given account. */
export async function startSession(accountId: string): Promise<void> {
  const token = await signSession(accountId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/** Clears the session cookie (logout). */
export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Returns the signed-in account id from the cookie, or `null`. */
export async function getSessionAccountId(): Promise<string | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Returns the signed-in account id only if it still exists in the database
 * (guards against a valid token for a deleted account). Returns `null`
 * otherwise.
 */
export async function getAuthenticatedAccountId(): Promise<string | null> {
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const account = await findAccountById(accountId);
  return account ? account.id : null;
}
