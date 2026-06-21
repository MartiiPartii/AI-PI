import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session-token';

/**
 * Route guard for authenticated areas (Next.js `proxy` convention, formerly
 * `middleware`).
 *
 * Runs in the Edge runtime, so it only verifies the session cookie's signature
 * (via `jose`) — no DB or password hashing here. It gates *navigation*; the
 * pages/services still re-derive the account from the cookie and scope every
 * query to it, so this is defence-in-depth, not the only check.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const accountId = await verifySession(token);

  if (!accountId) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard'],
};
