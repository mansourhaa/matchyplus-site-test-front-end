import { AUTH_COOKIE } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Redirect away from these when already authenticated (pre-existing behavior for login).
const publicRoutes = ['/login'];

// Always allowed regardless of auth state. /oauth-callback is reached via external
// redirect (OAuth provider callback), so bouncing based on a stale cookie would break
// the flow. /onboarding needs to be reachable both by a brand-new, unauthenticated
// visitor (its identity step now also collects phone + password + OTP — there is no
// separate pre-wizard credentials screen) and by an authenticated-but-incomplete user
// (the dashboard-guard redirect target) — neither `publicRoutes` (redirects away *if*
// logged in) nor the protected default below (redirects away *if not* logged in) fits
// both cases. /register is a dead route (its page just redirects to /onboarding, for old
// bookmarks/links) — it must be neutral too, or an unauthenticated visitor would be
// bounced to /login by this middleware before that page-level redirect ever runs.
// /otp-test is intentionally NOT here either — it's a dev-only harness (see
// app/otp-test/page.tsx, which 404s outside development), not part of the shipped
// product flow, so it gets the same auth rules as any other route.
const neutralRoutes = ['/oauth-callback', '/onboarding', '/register'];

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  if (neutralRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // /home is the right bounce target even for a user with incomplete onboarding: the
  // access-token cookie is HttpOnly and carries only { id, email, phone } (see
  // TokenService.signAccessToken) so the edge can't know onboarding status without either
  // decoding+DB-querying here or embedding a completeness claim that would go stale until
  // the next refresh. MatchyDashboardShell (which wraps /home) already client-side-bounces
  // an incomplete profile to /onboarding, so this is a one-hop redirect, not a bypass.
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Prefer /home as the canonical discover entry; avoid RSC redirect() timing bugs.
  if (pathname === '/discover' || pathname === '/projects') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
