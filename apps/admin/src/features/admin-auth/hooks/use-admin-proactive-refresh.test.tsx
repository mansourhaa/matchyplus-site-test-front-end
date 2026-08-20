import rootReducer from '@/features/auth/store/root-reducer';
import * as adminApiModule from '@/lib/admin-api';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminProactiveRefresh } from './use-admin-proactive-refresh';

vi.mock('@/lib/admin-api', () => ({
  refreshAdminSession: vi.fn(),
}));

function buildStore(admin: { id: string; role: string } | null) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: {
      adminAuth: {
        loading: false,
        error: null,
        admin,
        loginAt: null,
        passwordChangeLoading: false,
        passwordChangeError: null,
      },
    } as never,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

function renderWithStore(admin: { id: string; role: string } | null) {
  const store = buildStore(admin);
  return renderHook(() => useAdminProactiveRefresh(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
}

describe('useAdminProactiveRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does nothing while there is no admin session', async () => {
    renderWithStore(null);

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(adminApiModule.refreshAdminSession).not.toHaveBeenCalled();
  });

  // Regression: the admin access token is short-lived and the edge middleware can only
  // reject an expired cookie, never renew it — an idle-but-open panel needs something
  // proactively calling the refresh endpoint before that TTL runs out.
  it('refreshes the session every 5 minutes while authenticated', async () => {
    vi.mocked(adminApiModule.refreshAdminSession).mockResolvedValue(undefined);
    renderWithStore({ id: 'admin-1', role: 'SUPER_ADMIN' });

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(adminApiModule.refreshAdminSession).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(adminApiModule.refreshAdminSession).toHaveBeenCalledTimes(2);
  });

  it('stops refreshing once unmounted', async () => {
    vi.mocked(adminApiModule.refreshAdminSession).mockResolvedValue(undefined);
    const { unmount } = renderWithStore({ id: 'admin-1', role: 'SUPER_ADMIN' });

    unmount();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(adminApiModule.refreshAdminSession).not.toHaveBeenCalled();
  });
});
