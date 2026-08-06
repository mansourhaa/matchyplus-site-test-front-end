import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/** Request camera (and mic on web) before opening the recorder. */
export async function checkAndRequestCameraPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  const status = await Camera.checkPermissions();
  if (status.camera === 'granted') return true;
  if (status.camera === 'denied') return false;
  const requested = await Camera.requestPermissions({ permissions: ['camera'] });
  return requested.camera === 'granted';
}
