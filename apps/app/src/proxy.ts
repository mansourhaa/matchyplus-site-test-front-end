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

  // Legacy auth routes redirect to canonical French route names.
  if (pathname === '/login') {
    const redirectUrl = new URL('/connexion', request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === '/register') {
    const hasSeenIntro = request.cookies.get('matchy_intro_seen')?.value === '1';
    const redirectUrl = new URL(hasSeenIntro ? '/inscription' : '/onboarding', request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  // /oauth-callback, /inscription — see NEUTRAL_ROUTES in route-auth.ts.
  if (isNeutralRoute(pathname)) {
    return NextResponse.next();
  }

  const isPublicRoute = isPublicAuthRoute(pathname);

  // Deny-by-default: no usable session → /connexion (or /onboarding for first-time visitors on `/`)
  // for every protected path (includes all of app/(dashboard)/**).
  if (!usableSession && requiresAuthentication(pathname)) {
    if (pathname === '/' && request.cookies.get('matchy_intro_seen')?.value !== '1') {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    return NextResponse.redirect(new URL('/connexion', request.url));
  }

  // Authenticated visitors are bounced away from public auth surfaces (/connexion)
  // unless they are explicitly switching accounts (?switch=true) or their current session
  // is an incomplete onboarding draft (AUTH-001: an incomplete registration must not block
  // logging into an existing account).
  const isIncompleteOnboarding = request.cookies.get('matchy_onboarding_incomplete')?.value === '1';

  if (usableSession && isPublicRoute) {
    if (request.nextUrl.searchParams.get('switch') === 'true' || isIncompleteOnboarding) {
      return NextResponse.next();
    }
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
