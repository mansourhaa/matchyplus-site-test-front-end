import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

/**
 * Bridge to the custom Android LocationGate plugin (GPS on/off + in-app enable dialog).
 * Registered in apps/mobile/android/.../MainActivity.java.
 */
interface LocationGatePlugin {
  isEnabled(): Promise<{ enabled: boolean }>;
  openSettings(): Promise<void>;
  requestEnable(): Promise<{ enabled: boolean }>;
}

const LocationGate = registerPlugin<LocationGatePlugin>('LocationGate');

export function isNativeMobile(): boolean {
  return Capacitor.isNativePlatform();
}

export async function isGpsEnabled(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const { enabled } = await LocationGate.isEnabled();
    return enabled;
  } catch {
    return true;
  }
}

export async function requestEnableGps(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { enabled } = await LocationGate.requestEnable();
    return enabled;
  } catch {
    return false;
  }
}

export async function openLocationSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocationGate.openSettings();
  } catch {
    // ignore
  }
}

export async function requestLocationPermission(): Promise<'granted' | 'denied'> {
  if (!Capacitor.isNativePlatform()) return 'granted';
  try {
    const status = await Geolocation.requestPermissions();
    const value = status.location ?? status.coarseLocation;
    return value === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}
