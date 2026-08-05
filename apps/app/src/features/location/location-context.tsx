'use client';

import { api } from '@/lib/api';
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

const LOCATION_GRANTED_KEY = 'matchy_location_permission_granted';
const LOCATION_COORDS_KEY = 'matchy_location_coords';

type IpGeolocationResponse = {
  success: boolean;
  latitude: number | null;
  longitude: number | null;
};

type LocationContextValue = {
  latitude: number | null;
  longitude: number | null;
  locationSynced: boolean;
  permissionDenied: boolean;
  locationRequired: boolean;
  activating: boolean;
  accessMessage: string | null;
  requestBrowserLocation: () => Promise<boolean>;
};

const LocationContext = createContext<LocationContextValue | null>(null);

function readStoredCoords(): { latitude: number; longitude: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    if (window.localStorage.getItem(LOCATION_GRANTED_KEY) !== '1') return null;
    const raw = window.localStorage.getItem(LOCATION_COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { latitude?: number; longitude?: number };
    if (
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      Number.isFinite(parsed.latitude) &&
      Number.isFinite(parsed.longitude)
    ) {
      return { latitude: parsed.latitude, longitude: parsed.longitude };
    }
  } catch {
    // ignore
  }
  return null;
}

function storeCoords(next: { latitude: number; longitude: number }) {
  window.localStorage.setItem(LOCATION_GRANTED_KEY, '1');
  window.localStorage.setItem(LOCATION_COORDS_KEY, JSON.stringify(next));
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const stored = typeof window !== 'undefined' ? readStoredCoords() : null;
  const [latitude, setLatitude] = useState<number | null>(stored?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(stored?.longitude ?? null);
  const [locationSynced, setLocationSynced] = useState(Boolean(stored));
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [activating, setActivating] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  const syncCoords = useCallback((next: { latitude: number; longitude: number }) => {
    setLatitude(next.latitude);
    setLongitude(next.longitude);
    setLocationSynced(true);
    setPermissionDenied(false);
    storeCoords(next);
  }, []);

  const requestIpFallback = useCallback(async () => {
    try {
      const { data } = await api.get<IpGeolocationResponse>('/location/ip-geolocation');
      if (
        data.success &&
        typeof data.latitude === 'number' &&
        Number.isFinite(data.latitude) &&
        typeof data.longitude === 'number' &&
        Number.isFinite(data.longitude)
      ) {
        syncCoords({ latitude: data.latitude, longitude: data.longitude });
        setAccessMessage(
          'Using approximate location from your network because precise GPS is unavailable.',
        );
        return true;
      }
      setAccessMessage('Could not determine your location from your network. Try again later.');
      return false;
    } catch {
      setAccessMessage('Could not determine your location from your network. Try again later.');
      return false;
    }
  }, [syncCoords]);

  const requestBrowserLocation = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setAccessMessage('Geolocation is not supported in this browser. Trying network fallback.');
      setPermissionDenied(true);
      setActivating(true);
      try {
        return await requestIpFallback();
      } finally {
        setActivating(false);
      }
    }

    setActivating(true);
    setAccessMessage(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 60_000,
        });
      });

      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      syncCoords(next);
      setAccessMessage(null);
      return true;
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error ? Number(error.code) : null;
      if (code === 1) {
        setPermissionDenied(true);
        setAccessMessage('Precise location was denied. Trying approximate network fallback.');
        return await requestIpFallback();
      } else if (code === 3) {
        setAccessMessage('Precise location timed out. Trying approximate network fallback.');
        return await requestIpFallback();
      } else {
        setAccessMessage('Could not get your precise position. Trying network fallback.');
        return await requestIpFallback();
      }
    } finally {
      setActivating(false);
    }
  }, [requestIpFallback, syncCoords]);

  const value = useMemo(
    () => ({
      latitude,
      longitude,
      locationSynced,
      permissionDenied,
      locationRequired: permissionDenied || !locationSynced,
      activating,
      accessMessage,
      requestBrowserLocation,
    }),
    [
      latitude,
      longitude,
      locationSynced,
      permissionDenied,
      activating,
      accessMessage,
      requestBrowserLocation,
    ],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationGate() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationGate must be used within LocationProvider');
  return ctx;
}
