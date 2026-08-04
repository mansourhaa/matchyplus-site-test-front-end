import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MatchingRealtimeBridge } from './matching-realtime-bridge';

describe('MatchingRealtimeBridge', () => {
  const OriginalWebSocket = global.WebSocket;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
  });

  afterEach(() => {
    global.WebSocket = OriginalWebSocket;
    vi.clearAllMocks();
  });

  it('does not open a realtime socket for an unauthenticated visitor', () => {
    const WebSocketSpy = vi.fn();
    // @ts-expect-error minimal stub — only whether the constructor gets called matters here
    global.WebSocket = WebSocketSpy;

    renderWithAuthStore(<MatchingRealtimeBridge />, { status: 'unauthenticated', user: null });

    // Mounted at the app root (ClientProvider), reachable on /login and an unauthenticated
    // /onboarding — the socket itself must stay closed there instead of failing auth and
    // reconnecting every ~3s.
    expect(WebSocketSpy).not.toHaveBeenCalled();
  });

  it('opens a realtime socket once a session is authenticated', () => {
    const WebSocketSpy = vi.fn().mockImplementation(() => ({ close: vi.fn() }));
    // @ts-expect-error minimal stub — only whether the constructor gets called matters here
    global.WebSocket = WebSocketSpy;

    renderWithAuthStore(<MatchingRealtimeBridge />, {
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: null,
        phone: '+21612345678',
        name: 'Jane',
        auth_provider: 'phone',
        email_verified: false,
        onboarding_completed: true,
      },
    });

    expect(WebSocketSpy).toHaveBeenCalledTimes(1);
  });
});
