import { AUTH_COOKIE } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Redirect away from these when already authenticated (pre-existing behavior for
// login/register).
const publicRoutes = ['/login', '/register'];

// Always allowed regardless of auth state:
// - /oauth-callback is reached via external redirect (OAuth provider callback), so
//   bouncing based on a stale cookie would break the flow.
// - /otp-test is a dev testing tool, not a real login screen — no reason to force
//   logout before re-testing it.
const neutralRoutes = ['/oauth-callback', '/otp-test'];

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
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
