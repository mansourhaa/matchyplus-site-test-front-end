import { AUTH_COOKIE } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Redirect away from these when already authenticated (pre-existing behavior for
// login/register).
const publicRoutes = ['/login', '/register'];

// Always allowed regardless of auth state — /oauth-callback is reached via external
// redirect (OAuth provider callback), so bouncing based on a stale cookie would break
// the flow. /onboarding is NOT here: credentials (phone + password + OTP) are collected
// on /register first, so by the time /onboarding is reached a session always exists —
// it uses the normal protected-by-default rule below.
// /otp-test is intentionally NOT here either — it's a dev-only harness (see
// app/otp-test/page.tsx, which 404s outside development), not part of the shipped
// product flow, so it gets the same auth rules as any other route.
const neutralRoutes = ['/oauth-callback'];

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
