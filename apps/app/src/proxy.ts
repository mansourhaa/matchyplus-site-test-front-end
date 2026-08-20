import { AUTH_COOKIE } from '@/lib/auth';
import {
  hasUsableAccessTokenCookie,
  isNeutralRoute,
  isPublicAuthRoute,
  requiresAuthentication,
} from '@/lib/route-auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge gate for the member app. (dashboard) and every other non-public/non-neutral
 * path require a usable access_token cookie. Signature verification stays with the
 * API; this rejects missing/empty/malformed/expired cookies fail-closed. The
 * (dashboard) server layout + MatchyDashboardShell provide the same deny on RSC
 * and after client session check (middleware can be bypassed in some Next setups).
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const usableSession = hasUsableAccessTokenCookie(token);
  const { pathname } = request.nextUrl;

  // /oauth-callback, /onboarding, /register — see NEUTRAL_ROUTES in route-auth.ts.
  if (isNeutralRoute(pathname)) {
    return NextResponse.next();
  }

  const isPublicRoute = isPublicAuthRoute(pathname);

  // Deny-by-default: no usable session → /login for every protected path
  // (includes all of app/(dashboard)/**).
  if (!usableSession && requiresAuthentication(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // /home is the right bounce target even for a user with incomplete onboarding: the
  // access-token cookie is HttpOnly and carries only { id, email, phone } (see
  // TokenService.signAccessToken) so the edge can't know onboarding status without either
  // decoding+DB-querying here or embedding a completeness claim that would go stale until
  // the next refresh. MatchyDashboardShell (which wraps /home) already client-side-bounces
  // an incomplete profile to /onboarding, so this is a one-hop redirect, not a bypass.
  if (usableSession && isPublicRoute) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Prefer /home as the canonical discover entry; avoid RSC redirect() timing bugs.
  if (pathname === '/discover' || pathname === '/projects') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Legacy flat settings paths → nested /settings/* (bookmarks / old deep links).
  const settingsLegacyRedirects: Record<string, string> = {
    '/account-profile': '/settings/account',
    '/password': '/settings/password',
    '/add-phone-number': '/settings/add-phone-number',
    '/video-settings': '/settings/video',
    '/qr-code': '/settings/qr-code',
  };
  const nestedSettings = settingsLegacyRedirects[pathname];
  if (nestedSettings) {
    return NextResponse.redirect(new URL(nestedSettings, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
