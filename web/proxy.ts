import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session-token';

/**
 * Session-aware route guard (Next.js `proxy` convention, formerly `middleware`).
 *
 * Runs in the Edge runtime, so it only verifies the session cookie's signature
 * (via `jose`) — no DB or password hashing here. It keeps navigation consistent
 * with the session state in both directions:
 *   • Protected area (`/dashboard*`) without a session → redirect to /login.
 *   • Auth pages (`/login`, `/signup`) WITH a session   → redirect to /dashboard.
 *
 * Pages still re-derive the account from the cookie, so this is the routing
 * guard, not the only check. (Signature-based, matching the pages' own guard,
 * so a valid cookie can never bounce between the two — no redirect loop.)
 */
const AUTH_PAGES = ['/login', '/signup'];

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const accountId = await verifySession(token);
  const { pathname } = request.nextUrl;

  const isAuthPage = AUTH_PAGES.includes(pathname);
  const isProtected = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  // Signed in but on an auth page → send to the dashboard.
  if (isAuthPage && accountId) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Not signed in but on a protected page → send to login (remember target).
  if (isProtected && !accountId) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard', '/login', '/signup'],
};
