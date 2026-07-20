import { ADMIN_AUTH_COOKIE } from '@/lib/admin-auth';
import { AUTH_COOKIE } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/register'];

const ADMIN_ROOT = '/admin';
const ADMIN_LOGIN_ROUTE = '/admin/login';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The admin panel has its own session and its own login screen, so it has to be
  // resolved before the rules below — otherwise admins fall through to /login.
  if (pathname === ADMIN_ROOT || pathname.startsWith(`${ADMIN_ROOT}/`)) {
    const adminToken = request.cookies.get(ADMIN_AUTH_COOKIE)?.value;
    const isAdminLogin = pathname === ADMIN_LOGIN_ROUTE;

    if (!adminToken && !isAdminLogin) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN_ROUTE, request.url));
    }

    if (adminToken && isAdminLogin) {
      return NextResponse.redirect(new URL(ADMIN_ROOT, request.url));
    }

    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
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
