import { ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_ROOT = '/admin';
const ADMIN_LOGIN_ROUTE = '/admin/login';

/**
 * Admin half of the former apps/app proxy, unchanged in behaviour. The credential itself is
 * an HttpOnly cookie owned by the API, which this middleware cannot see once the API sits on
 * another host. Redirects only need to know whether a session was opened, so they key off the
 * non-secret marker; the API remains the thing that actually authorises every admin call.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // This app only serves the dashboard, so the root goes straight to it.
  if (pathname === '/') {
    return NextResponse.redirect(new URL(ADMIN_ROOT, request.url));
  }

  const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isAdminLogin = pathname === ADMIN_LOGIN_ROUTE;

  if (!adminSession && !isAdminLogin) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN_ROUTE, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
