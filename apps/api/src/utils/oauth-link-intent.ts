import { createHmac, timingSafeEqual } from 'node:crypto';

import { config } from '../config.js';

const LINK_COOKIE = 'oauth_link_intent';
const LINK_TTL_SECONDS = 10 * 60;

export type OAuthLinkIntent = {
  userId: string;
  provider: 'google' | 'linkedin';
};

function sign(payload: string): string {
  return createHmac('sha256', config.accessTokenSecret).update(payload).digest('base64url');
}

export function createOAuthLinkIntentValue(intent: OAuthLinkIntent): string {
  const body = Buffer.from(
    JSON.stringify({
      ...intent,
      exp: Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS,
    }),
  ).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function parseOAuthLinkIntentValue(raw: string | undefined | null): OAuthLinkIntent | null {
  if (!raw) return null;
  const [body, sig] = raw.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      userId?: string;
      provider?: string;
      exp?: number;
    };
    if (!parsed.userId || (parsed.provider !== 'google' && parsed.provider !== 'linkedin')) {
      return null;
    }
    if (typeof parsed.exp !== 'number' || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { userId: parsed.userId, provider: parsed.provider };
  } catch {
    return null;
  }
}

export const OAUTH_LINK_COOKIE = LINK_COOKIE;

export function oauthLinkCookieOptions() {
  const domain = process.env['MEMBER_COOKIE_DOMAIN'];
  return {
    httpOnly: true,
    secure: process.env['NODE_ENV'] !== 'development',
    sameSite: 'lax' as const,
    path: '/api/v1/auth',
    maxAge: LINK_TTL_SECONDS,
    ...(domain ? { domain } : {}),
  };
}

export function clearOAuthLinkCookieOptions() {
  return { ...oauthLinkCookieOptions(), maxAge: 0 };
}
