'use client';

import {
  GEOLOCATION_MAX_AGE,
  GEOLOCATION_TIMEOUT,
  IP_FALLBACK_NOTICE,
  LOCATION_COORDS_KEY,
  LOCATION_GRANTED_KEY,
} from '@/constants';
import { api } from '@/lib/api';
import { handleError } from '@/lib/error-handler';
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
  useRef,
  useState,
} from 'react';

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
  } catch (error) {
    handleError(error, 'readStoredCoords');
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
      timeout: GEOLOCATION_TIMEOUT,
      maximumAge: GEOLOCATION_MAX_AGE,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw Object.assign(new Error('unsupported'), { code: 0 });
  }

  const getPosition = (enableHighAccuracy: boolean, timeout: number) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy,
        timeout,
        maximumAge: GEOLOCATION_MAX_AGE,
      });
    });

  try {
    const position = await getPosition(true, 5000);
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? Number(error.code) : null;
    if (code === 1) {
      // Permission explicitly denied by user, do not retry
      throw error;
    }
    // Timeout or position unavailable: retry with standard accuracy (Wi-Fi / IP)
    const fallbackPosition = await getPosition(false, 10000);
    return {
      latitude: fallbackPosition.coords.latitude,
      longitude: fallbackPosition.coords.longitude,
    };
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const stored = typeof window !== 'undefined' ? readStoredCoords() : null;
  const [latitude, setLatitude] = useState<number | null>(stored?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(stored?.longitude ?? null);
  const [locationSynced, setLocationSynced] = useState(Boolean(stored));
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [activating, setActivating] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const lastSyncedCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const clearLocation = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(LOCATION_GRANTED_KEY);
        window.localStorage.removeItem(LOCATION_COORDS_KEY);
      } catch (error) {
        handleError(error, 'clearLocation');
      }
    }
    setLatitude(null);
    setLongitude(null);
    setLocationSynced(false);
    lastSyncedCoordsRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;

    let permissionStatus: PermissionStatus | null = null;

    const handlePermissionChange = () => {
      if (permissionStatus?.state === 'denied') {
        clearLocation();
        setPermissionDenied(true);
        setAccessMessage(
          'Location permission is disabled or denied. Please enable location to continue.',
        );
      } else if (permissionStatus?.state === 'prompt') {
        clearLocation();
        setPermissionDenied(false);
        setAccessMessage(null);
      } else if (permissionStatus?.state === 'granted') {
        setPermissionDenied(false);
        setAccessMessage(null);
      }
    };

    void navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        permissionStatus = status;
        if (status.state === 'denied') {
          handlePermissionChange();
        } else if (status.state === 'prompt') {
          clearLocation();
          setPermissionDenied(false);
          setAccessMessage(null);
        } else if (status.state === 'granted') {
          setPermissionDenied(false);
          setAccessMessage(null);
        }
        status.addEventListener('change', handlePermissionChange);
      })
      .catch((error) => {
        handleError(error, 'geolocationPermissionQuery');
      });

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

    // Skip redundant network requests if coordinates have not changed
    if (
      lastSyncedCoordsRef.current?.latitude === next.latitude &&
      lastSyncedCoordsRef.current?.longitude === next.longitude
    ) {
      return;
    }
    lastSyncedCoordsRef.current = next;

    // Best-effort: keeps the profile's city connected to where the member actually is.
    void api.post('/users/me/location', next).catch((error) => {
      handleError(error, 'syncUserLocation');
    });
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
    } catch (error) {
      handleError(error, 'requestIpFallback');
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
      handleError(error, 'requestBrowserLocation');
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
 * Captures coordinates automatically. When permission is already "granted", gets position
 * silently. When permission is "prompt" (undecided), invokes the browser's native location
 * prompt automatically on mount. Does nothing when permission is explicitly "denied" or
 * when location is already synced.
 */
export function useAutoCaptureGrantedLocation(enabled = true) {
  const { locationSynced, permissionDenied, activating, requestBrowserLocation } =
    useLocationContext();
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (locationSynced) {
      hasTriggeredRef.current = false;
      return;
    }

    if (!enabled || activating || permissionDenied || hasTriggeredRef.current) return;

    if (typeof navigator === 'undefined') return;

    // If Permissions API is available, check state
    if (navigator.permissions?.query) {
      let cancelled = false;
      void navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (!cancelled && !hasTriggeredRef.current) {
            if (status.state === 'granted' || (!locationSynced && status.state === 'prompt')) {
              hasTriggeredRef.current = true;
              void requestBrowserLocation();
            }
          }
        })
        .catch((error) => {
          handleError(error, 'useAutoCaptureGrantedLocation');
          if (!cancelled && !hasTriggeredRef.current && !locationSynced) {
            hasTriggeredRef.current = true;
            void requestBrowserLocation();
          }
        });

      return () => {
        cancelled = true;
      };
    } else if (!hasTriggeredRef.current && !locationSynced) {
      hasTriggeredRef.current = true;
      void requestBrowserLocation();
    }
  }, [enabled, locationSynced, activating, permissionDenied, requestBrowserLocation]);
}
