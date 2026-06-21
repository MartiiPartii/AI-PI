/**
 * Session token signing/verification (JWT, HS256).
 *
 * Deliberately dependency-light and runtime-agnostic: it uses only `jose`, which
 * runs in the Edge runtime, so the same verify function works in `middleware.ts`
 * (Edge) and in Server Actions/route handlers (Node). It must NOT import
 * `next/headers`, Prisma, or argon2 — those would break the Edge bundle.
 */
import { SignJWT, jwtVerify } from 'jose';

/** Name of the session cookie. */
export const SESSION_COOKIE = 'aipi_session';

/** Session lifetime in seconds (7 days). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // Fail fast: a short/missing secret silently weakens every session.
    throw new Error(
      'SESSION_SECRET is missing or too short (need at least 32 characters).',
    );
  }
  return new TextEncoder().encode(secret);
}

/** Signs a session token carrying the account id as the subject. */
export async function signSession(accountId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(accountId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

/**
 * Verifies a session token. Returns the account id, or `null` if the token is
 * missing, malformed, expired, or has an invalid signature.
 */
export async function verifySession(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
