import { describe, expect, it, vi } from 'vitest';

import { handleProviderOAuthCallback } from '../lib/oauth-callback-handler.js';

describe('OAuth Callback Handler — Web vs Mobile Redirection', () => {
  it('redirects web user to frontendUrl on error', async () => {
    const fastifyMock = {
      oauth2Google: {},
    };
    const requestMock = {
      cookies: {},
      query: { error: 'access_denied' },
      log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    };
    const replyMock = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
    };

    await handleProviderOAuthCallback(
      fastifyMock as never,
      requestMock as never,
      replyMock as never,
      'google',
      {} as never,
    );

    expect(replyMock.redirect).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/localhost:3000\/oauth-callback\?error=access_denied/),
    );
  });

  it('redirects mobile user to appScheme://oauth-callback on error when oauth-platform cookie is mobile', async () => {
    const fastifyMock = {
      oauth2Google: {},
    };
    const requestMock = {
      cookies: { 'oauth-platform': 'mobile' },
      query: { error: 'access_denied' },
      log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    };
    const replyMock = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
    };

    await handleProviderOAuthCallback(
      fastifyMock as never,
      requestMock as never,
      replyMock as never,
      'google',
      {} as never,
    );

    expect(replyMock.clearCookie).toHaveBeenCalledWith('oauth-platform', { path: '/' });
    expect(replyMock.redirect).toHaveBeenCalledWith('matchy://oauth-callback?error=access_denied');
  });

  it('redirects mobile user to appScheme://oauth-callback on success when query platform is mobile', async () => {
    const fastifyMock = {
      oauth2Google: {
        getAccessTokenFromAuthorizationCodeFlow: vi.fn().mockResolvedValue({
          token: { access_token: 'valid-google-access-token' },
        }),
      },
    };
    const requestMock = {
      cookies: {},
      query: { platform: 'mobile' },
      log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    };
    const replyMock = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
    };
    const oauthAuthServiceMock = {
      findOrCreateOAuthUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
      createExchangeCode: vi.fn().mockResolvedValue('test-exchange-code-123'),
    };

    // Mock fetchGoogleProfile via global fetch
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'google-sub-1',
        email: 'user@example.com',
        email_verified: true,
        name: 'Test User',
      }),
    } as never);

    try {
      await handleProviderOAuthCallback(
        fastifyMock as never,
        requestMock as never,
        replyMock as never,
        'google',
        oauthAuthServiceMock as never,
      );

      expect(replyMock.redirect).toHaveBeenCalledWith(
        'matchy://oauth-callback?code=test-exchange-code-123',
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('redirects web user to frontendUrl on success', async () => {
    const fastifyMock = {
      oauth2Google: {
        getAccessTokenFromAuthorizationCodeFlow: vi.fn().mockResolvedValue({
          token: { access_token: 'valid-google-access-token' },
        }),
      },
    };
    const requestMock = {
      cookies: {},
      query: {},
      log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    };
    const replyMock = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
    };
    const oauthAuthServiceMock = {
      findOrCreateOAuthUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
      createExchangeCode: vi.fn().mockResolvedValue('test-exchange-code-456'),
    };

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'google-sub-1',
        email: 'user@example.com',
        email_verified: true,
        name: 'Test User',
      }),
    } as never);

    try {
      await handleProviderOAuthCallback(
        fastifyMock as never,
        requestMock as never,
        replyMock as never,
        'google',
        oauthAuthServiceMock as never,
      );

      expect(replyMock.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/oauth-callback?code=test-exchange-code-456',
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
