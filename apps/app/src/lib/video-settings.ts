'use client';

import { useSyncExternalStore } from 'react';

export type VideoQuality = 'hd' | 'standard' | 'saving';

export interface VideoSettings {
  quality: VideoQuality;
  autoPlay: boolean;
  wifiOnly: boolean;
}

const STORAGE_KEY = 'matchy_video_settings';
const CHANGE_EVENT = 'matchy_video_settings_change';

const DEFAULT_SETTINGS: VideoSettings = {
  quality: 'standard',
  autoPlay: true,
  wifiOnly: false,
};

let cachedSettings: VideoSettings = DEFAULT_SETTINGS;
let cachedRaw: string | null = null;

export function getStoredVideoSettings(): VideoSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw && cachedSettings) return cachedSettings;
    cachedRaw = raw;
    if (!raw) {
      cachedSettings = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<VideoSettings>;
    cachedSettings = {
      quality: parsed.quality === 'hd' || parsed.quality === 'saving' ? parsed.quality : 'standard',
      autoPlay: typeof parsed.autoPlay === 'boolean' ? parsed.autoPlay : true,
      wifiOnly: typeof parsed.wifiOnly === 'boolean' ? parsed.wifiOnly : false,
    };
    return cachedSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredVideoSettings(settings: Partial<VideoSettings>): VideoSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const current = getStoredVideoSettings();
    const updated: VideoSettings = { ...current, ...settings };
    cachedSettings = updated;
    cachedRaw = JSON.stringify(updated);
    localStorage.setItem(STORAGE_KEY, cachedRaw);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: updated }));
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function getVideoMediaConstraints(
  quality: VideoQuality,
  facing: 'user' | 'environment' = 'user',
): MediaTrackConstraints {
  const base: MediaTrackConstraints = { facingMode: facing };
  switch (quality) {
    case 'hd':
      return { ...base, width: { ideal: 1920 }, height: { ideal: 1080 } };
    case 'saving':
      return { ...base, width: { ideal: 854 }, height: { ideal: 480 } };
    case 'standard':
    default:
      return { ...base, width: { ideal: 1280 }, height: { ideal: 720 } };
  }
}

export function canStreamOrAutoPlay(settings: VideoSettings): boolean {
  if (typeof navigator === 'undefined') return settings.autoPlay;
  if (settings.wifiOnly && 'connection' in navigator) {
    const conn = (
      navigator as unknown as {
        connection?: { type?: string; effectiveType?: string; saveData?: boolean };
      }
    ).connection;
    if (conn) {
      if (conn.saveData) return false;
      if (
        conn.type &&
        conn.type !== 'wifi' &&
        conn.type !== 'ethernet' &&
        conn.type !== 'unknown'
      ) {
        return false;
      }
      if (conn.effectiveType && (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g')) {
        return false;
      }
    }
  }
  return settings.autoPlay;
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useVideoSettings(): {
  settings: VideoSettings;
  updateSettings: (newSettings: Partial<VideoSettings>) => void;
} {
  const settings = useSyncExternalStore(subscribe, getStoredVideoSettings, () => DEFAULT_SETTINGS);

  const updateSettings = (newSettings: Partial<VideoSettings>) => {
    saveStoredVideoSettings(newSettings);
  };

  return { settings, updateSettings };
}
