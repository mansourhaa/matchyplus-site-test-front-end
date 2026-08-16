'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { Camera, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type IdentityVerificationCameraProps = {
  onCapture: (selfie: Blob) => void;
  disabled?: boolean;
};

// Camera-only selfie capture , no file-picker fallback.

export function IdentityVerificationCamera({
  onCapture,
  disabled,
}: IdentityVerificationCameraProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const openCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setError(t('identityVerification.camera.cameraError'));
    }
  };

  // The <video> element only mounts once cameraOpen is true, so the stream can only be
  // attached to it on the render right after that — not inside openCamera itself.
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPreviewUrl(URL.createObjectURL(blob));
        stopStream();
        setCameraOpen(false);
        onCapture(blob);
      },
      'image/jpeg',
      0.9,
    );
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    void openCamera();
  };

  if (previewUrl) {
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-2xl" style={{ border: '2px solid #2F76BB' }}>
          <img
            src={previewUrl}
            alt={t('identityVerification.camera.capturedAlt')}
            className="w-full"
          />
        </div>
        <button
          type="button"
          onClick={retake}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5"
          style={{
            border: '1.5px solid #D4E1EE',
            fontSize: '13px',
            fontWeight: 700,
            color: '#253044',
          }}
        >
          <RotateCcw size={15} />
          {t('identityVerification.camera.retake')}
        </button>
      </div>
    );
  }

  if (cameraOpen) {
    return (
      <div className="space-y-2">
        <div
          className="overflow-hidden rounded-2xl"
          style={{ border: '2px solid #2F76BB', background: '#000' }}
        >
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
        </div>
        <button
          type="button"
          onClick={capture}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-white"
          style={{
            background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <Camera size={15} />
          {t('identityVerification.camera.capture')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void openCamera()}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5"
        style={{
          border: '1.5px solid #D4E1EE',
          background: '#F8FBFF',
          fontSize: '13px',
          fontWeight: 700,
          color: '#253044',
        }}
      >
        <Camera size={15} color="#2F76BB" />
        {t('identityVerification.camera.openCamera')}
      </button>
      {error && <p style={{ fontSize: '12px', color: '#B03A4D' }}>{error}</p>}
    </div>
  );
}
