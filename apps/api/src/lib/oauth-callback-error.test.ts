import { describe, expect, it } from 'vitest';

import { normalizeOAuthCallbackError } from './oauth-callback-error.js';

describe('normalizeOAuthCallbackError', () => {
  it('passes through known codes', () => {
    expect(normalizeOAuthCallbackError('access_denied')).toBe('access_denied');
    expect(normalizeOAuthCallbackError('oauth_email_unverified')).toBe('oauth_email_unverified');
  });

  it('maps @fastify/oauth2 and Google token failures', () => {
    expect(normalizeOAuthCallbackError('Invalid state')).toBe('oauth_invalid_state');
    expect(normalizeOAuthCallbackError('Response Error: 400 Bad Request')).toBe(
      'oauth_token_exchange_failed',
    );
    expect(normalizeOAuthCallbackError('Response Error: 401 Unauthorized')).toBe(
      'oauth_token_exchange_failed',
    );
    expect(normalizeOAuthCallbackError('{"error":"invalid_grant"}')).toBe(
      'oauth_token_exchange_failed',
    );
  });

  it('fails closed on empty or unknown messages', () => {
    expect(normalizeOAuthCallbackError('')).toBe('oauth_failed');
    expect(normalizeOAuthCallbackError(null)).toBe('oauth_failed');
    expect(normalizeOAuthCallbackError('Unique constraint failed')).toBe('oauth_failed');
  });
});
