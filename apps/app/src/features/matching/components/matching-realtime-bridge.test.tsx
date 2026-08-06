import authReducer from '@/features/auth/store/auth-slice';
import type { AuthState } from '@/features/auth/types';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import messagingReducer from '@/features/messaging/store/messaging-slice';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MatchingRealtimeBridge } from './matching-realtime-bridge';

// MatchingRealtimeBridge also mounts MessagingSendErrorToaster (from the messaging
// feature), which reads `state.messaging` and needs an I18nProvider ancestor — so this
// test's store carries that reducer too, and renderWithAuthStore's single-reducer
// (auth-only) store isn't enough here.
function buildStore(authState: Partial<AuthState>) {
  const defaultAuthState: AuthState = {
    status: 'unknown',
    loading: false,
    error: null,
    user: null,
    sessionChecked: true,
    sessionGeneration: 0,
  };
  return configureStore({
    reducer: { auth: authReducer, messaging: messagingReducer },
    preloadedState: {
      auth: { ...defaultAuthState, ...authState },
    },
  });
}

function renderBridge(authState: Partial<AuthState>) {
  const store = buildStore(authState);
  render(
    <Provider store={store}>
      <I18nProvider>
        <MatchingRealtimeBridge />
      </I18nProvider>
    </Provider>,
  );
  return store;
}

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

    renderBridge({ status: 'unauthenticated', user: null });

    // Mounted at the app root (ClientProvider), reachable on /login and an unauthenticated
    // /onboarding — the socket itself must stay closed there instead of failing auth and
    // reconnecting every ~3s.
    expect(WebSocketSpy).not.toHaveBeenCalled();
  });

  it('opens a realtime socket once a session is authenticated', () => {
    const WebSocketSpy = vi.fn().mockImplementation(() => ({ close: vi.fn() }));
    // @ts-expect-error minimal stub — only whether the constructor gets called matters here
    global.WebSocket = WebSocketSpy;

    renderBridge({
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: null,
        phone: '+21612345678',
        name: 'Jane',
        auth_provider: 'phone',
        email_verified: false,
        verified: false,
        onboarding_completed: true,
      },
    });

    expect(WebSocketSpy).toHaveBeenCalledTimes(1);
  });

  it('does not open a socket for a persisted-but-unchecked session, and does not reconnect once the check clears it as unauthenticated', () => {
    const WebSocketSpy = vi.fn();
    // @ts-expect-error minimal stub — only whether the constructor gets called matters here
    global.WebSocket = WebSocketSpy;

    // redux-persist can rehydrate a stale `status: 'authenticated'` before
    // useBootstrapSession's fetchCurrentUser call confirms the cookie is still valid —
    // sessionChecked stays false during that window.
    const store = renderBridge({
      status: 'authenticated',
      sessionChecked: false,
      user: {
        id: 'user-1',
        email: null,
        phone: '+21612345678',
        name: 'Jane',
        auth_provider: 'phone',
        email_verified: false,
        verified: false,
        onboarding_completed: true,
      },
    });

    expect(WebSocketSpy).not.toHaveBeenCalled();

    // fetchCurrentUser.rejected: the cookie had actually expired. The already-mounted
    // component re-renders from this dispatch alone (it's subscribed via useSelector).
    // generationAtStart must match the store's current sessionGeneration (0, the default
    // from buildStore) — auth-slice discards a stale-generation response, so a raw
    // dispatch without it would otherwise be a no-op against the real reducer.
    store.dispatch({ type: 'auth/fetchCurrentUser/rejected', payload: { generationAtStart: 0 } });

    expect(WebSocketSpy).not.toHaveBeenCalled();
  });
});
