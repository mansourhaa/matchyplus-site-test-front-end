/**
 * Maps raw @fastify/oauth2 / provider / Prisma error strings into stable codes the
 * SPA can display. Never forward opaque upstream text like "Response Error: 400…".
 */
export function normalizeOAuthCallbackError(raw: string | undefined | null): string {
  const message = (raw ?? '').trim();
  if (!message) return 'oauth_failed';

  if (
    message === 'access_denied' ||
    message === 'oauth_email_unverified' ||
    message === 'oauth_link_conflict' ||
    message === 'oauth_link_email_mismatch' ||
    message === 'oauth_provider_not_configured' ||
    message === 'oauth_profile_fetch_failed' ||
    message === 'oauth_invalid_state' ||
    message === 'oauth_token_exchange_failed' ||
    message === 'oauth_failed' ||
    message === 'user_not_found'
  ) {
    return message;
  }

  if (message === 'Invalid state') return 'oauth_invalid_state';
  if (/^Response Error:\s*400/i.test(message)) return 'oauth_token_exchange_failed';
  if (/access_denied/i.test(message)) return 'access_denied';

  return 'oauth_failed';
}
