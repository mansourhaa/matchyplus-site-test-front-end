import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export type AvPermissionDenial = 'camera' | 'microphone' | 'unknown';

export type AvPermissionResult = { ok: true } | { ok: false; reason: AvPermissionDenial };

/**
 * Request camera + microphone before opening the presentation-video recorder.
 * Web: single getUserMedia A/V probe.
 * Native: Capacitor Camera permission, then getUserMedia A/V so Android also
 * prompts for RECORD_AUDIO (Camera plugin alone does not request the mic).
 */
export async function checkAndRequestAvPermission(): Promise<AvPermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: classifyMediaDenial(error) };
    }
  }

  try {
    const status = await Camera.checkPermissions();
    if (status.camera === 'denied') {
      return { ok: false, reason: 'camera' };
    }
    if (status.camera !== 'granted') {
      const requested = await Camera.requestPermissions({ permissions: ['camera'] });
      if (requested.camera !== 'granted') {
        return { ok: false, reason: 'camera' };
      }
    }
  } catch {
    return { ok: false, reason: 'camera' };
  }

  // Trigger the OS mic (and confirm camera) runtime prompt in the WebView.
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: classifyMediaDenial(error) };
  }
}

/** @deprecated Prefer checkAndRequestAvPermission for mic-aware results. */
export async function checkAndRequestCameraPermission(): Promise<boolean> {
  const result = await checkAndRequestAvPermission();
  return result.ok;
}

function classifyMediaDenial(error: unknown): AvPermissionDenial {
  const name = (error as DOMException | undefined)?.name ?? '';
  const message = String((error as Error | undefined)?.message ?? '').toLowerCase();
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    if (message.includes('audio') || message.includes('microphone') || message.includes('mic')) {
      return 'microphone';
    }
    return 'camera';
  }
  if (name === 'NotFoundError' && (message.includes('audio') || message.includes('microphone'))) {
    return 'microphone';
  }
  return 'unknown';
}
