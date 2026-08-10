'use client';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const LOCATION_GRANTED_KEY = 'matchy_location_permission_granted';
const LOCATION_COORDS_KEY = 'matchy_location_coords';

const IP_FALLBACK_NOTICE =
  'Using approximate location from your network because precise GPS is unavailable.';

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

async function getCurrentCoords(): Promise<{ latitude: number; longitude: number }> {
  if (Capacitor.isNativePlatform()) {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 60_000,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }

  if (!navigator.geolocation) {
    throw Object.assign(new Error('unsupported'), { code: 0 });
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 60_000,
    });
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const stored = typeof window !== 'undefined' ? readStoredCoords() : null;
  const [latitude, setLatitude] = useState<number | null>(stored?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(stored?.longitude ?? null);
  const [locationSynced, setLocationSynced] = useState(Boolean(stored));
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [activating, setActivating] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  const clearLocation = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(LOCATION_GRANTED_KEY);
        window.localStorage.removeItem(LOCATION_COORDS_KEY);
      } catch {
        // ignore
      }
    }
    setLatitude(null);
    setLongitude(null);
    setLocationSynced(false);
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;

    let permissionStatus: PermissionStatus | null = null;

    const handlePermissionChange = () => {
      if (permissionStatus?.state === 'denied' || permissionStatus?.state === 'prompt') {
        clearLocation();
        if (permissionStatus.state === 'denied') {
          setPermissionDenied(true);
          setAccessMessage(
            'Location permission is disabled or denied. Please enable location to continue.',
          );
        } else {
          setPermissionDenied(false);
          setAccessMessage(null);
        }
      }
    };

    void navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        permissionStatus = status;
        if (status.state === 'denied' || status.state === 'prompt') {
          handlePermissionChange();
        }
        status.addEventListener('change', handlePermissionChange);
      })
      .catch(() => {});

    return () => {
      permissionStatus?.removeEventListener('change', handlePermissionChange);
    };
  }, [clearLocation]);

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
        // Overlay unmounts once locationSynced is true, so disclose via toast.
        toast.message(IP_FALLBACK_NOTICE);
        setAccessMessage(null);
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
    if (typeof window === 'undefined') {
      setAccessMessage('Geolocation is not available. Trying network fallback.');
      setPermissionDenied(true);
      setActivating(true);
      try {
        return await requestIpFallback();
      } finally {
        setActivating(false);
      }
    }

    if (!Capacitor.isNativePlatform() && !navigator.geolocation) {
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
      if (Capacitor.isNativePlatform()) {
        const status = await Geolocation.requestPermissions();
        const granted = status.location === 'granted' || status.coarseLocation === 'granted';
        if (!granted) {
          clearLocation();
          setPermissionDenied(true);
          setAccessMessage(
            'Location permission is disabled or denied. Please enable location to continue.',
          );
          return false;
        }
      }

      const next = await getCurrentCoords();
      syncCoords(next);
      setAccessMessage(null);
      return true;
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error ? Number(error.code) : null;
      if (code === 1) {
        clearLocation();
        setPermissionDenied(true);
        setAccessMessage(
          'Location permission is disabled or denied. Please enable location to continue.',
        );
        return false;
      }
      if (code === 3) {
        setAccessMessage('Precise location timed out. Trying approximate network fallback.');
        return await requestIpFallback();
      }
      setAccessMessage('Could not get your precise position. Trying network fallback.');
      return await requestIpFallback();
    } finally {
      setActivating(false);
    }
  }, [clearLocation, requestIpFallback, syncCoords]);

  const value = useMemo(
    () => ({
      latitude,
      longitude,
      locationSynced,
      permissionDenied,
      locationRequired: !locationSynced,
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

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocationContext must be used within LocationProvider');
  }
  return ctx;
}

/** Canonical hook name used by matching views / tests. */
export const useLocationGate = useLocationContext;

/**
 * If Permissions API reports geolocation already granted, capture coords without the
 * overlay button. Does nothing when state is still "prompt" (needs a user gesture —
 * onboarding Finish or the overlay CTA).
 */
export function useAutoCaptureGrantedLocation() {
  const { locationSynced, activating, requestBrowserLocation } = useLocationContext();

  useEffect(() => {
    if (locationSynced || activating) return;
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;

    let cancelled = false;
    void navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (!cancelled && status.state === 'granted') {
          void requestBrowserLocation();
        }
      })
      .catch(() => {
        // Safari / older browsers may reject permissions.query for geolocation.
      });

    return () => {
      cancelled = true;
    };
  }, [activating, locationSynced, requestBrowserLocation]);
}
