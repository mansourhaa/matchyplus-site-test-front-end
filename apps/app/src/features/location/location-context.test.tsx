import { api } from '@/lib/api';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationProvider, useLocationGate } from './location-context';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}));

describe('LocationProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it('falls back to IP geolocation when browser geolocation is denied', async () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) =>
        error({ code: 1 } as GeolocationPositionError),
    );
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, latitude: 36.8065, longitude: 10.1815 },
    } as Awaited<ReturnType<typeof api.get>>);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationGate(), { wrapper });

    await act(async () => {
      await result.current.requestBrowserLocation();
    });

    await waitFor(() => expect(result.current.locationSynced).toBe(true));
    expect(api.get).toHaveBeenCalledWith('/location/ip-geolocation');
    expect(result.current.latitude).toBe(36.8065);
    expect(result.current.longitude).toBe(10.1815);
    expect(result.current.locationRequired).toBe(false);
    expect(result.current.accessMessage).toContain('approximate location');
  });

  it('keeps location required when GPS and IP fallback both fail', async () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) =>
        error({ code: 3 } as GeolocationPositionError),
    );
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    vi.mocked(api.get).mockResolvedValue({
      data: { success: false, latitude: null, longitude: null },
    } as Awaited<ReturnType<typeof api.get>>);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationGate(), { wrapper });

    await act(async () => {
      await result.current.requestBrowserLocation();
    });

    await waitFor(() =>
      expect(result.current.accessMessage).toBe(
        'Could not determine your location from your network. Try again later.',
      ),
    );
    expect(result.current.locationSynced).toBe(false);
    expect(result.current.locationRequired).toBe(true);
  });
});
