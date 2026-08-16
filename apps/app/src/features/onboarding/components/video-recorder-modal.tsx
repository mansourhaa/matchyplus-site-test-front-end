'use client';

import {
  VIDEO_PRESENTATION_TIPS,
  type VoiceLangCode,
  voiceLangToDetectedLang,
} from '@/features/onboarding/video-tips';
import { checkAndRequestAvPermission } from '@/lib/permissions';
import { Capacitor } from '@capacitor/core';
import {
  AlertCircle,
  Camera,
  Check,
  ChevronRight,
  FlipHorizontal,
  Mic,
  RotateCcw,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

type Phase =
  | 'choose' // initial: camera or upload
  | 'preview' // live camera preview
  | 'recording' // recording in progress
  | 'review' // review recorded clip
  | 'uploading'; // validating uploaded file

const MAX_DURATION = 20;
const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

export interface VideoRecorderTranslations {
  // Choose phase
  chooseModeTitle: string;
  chooseModeSubtitle: string;
  cameraBtn: string;
  cameraDesc: string;
  uploadBtn: string;
  uploadDesc: string;
  // Camera controls
  startRec: string;
  stopRec: string;
  retake: string;
  camError: string;
  sec: string;
  readyTitle: string;
  reviewTitle: string;
  // After review
  confirmBtn: string;
  // Upload
  uploadBrowse: string;
  videoTooLong: string;
  // Tip (what to say)
  videoTip: string;
  // Camera permission — popup interne de ré-autorisation (sans renvoi aux réglages)
  permBlockedTitle: string;
  permBlockedDesc: string;
  permBlockedRetry: string;
  permBlockedClose: string;
  micRefused: string;
  invalidVideoFile: string;
  chooseAnotherMethod: string;
}

interface VideoRecorderModalProps {
  onVideoReady: (blob: Blob, blobUrl: string, filename: string) => void;
  onClose: () => void;
  tr: VideoRecorderTranslations;
  isRtl?: boolean;
  voiceLang?: VoiceLangCode;
}

/** Build translations from lang code (called by Inscription1) */
export function buildVideoRecorderTr(
  lang: 'fr' | 'en' | 'ar',
  voiceLang: VoiceLangCode,
): VideoRecorderTranslations {
  const detectedLang = voiceLangToDetectedLang(voiceLang);
  const tip = VIDEO_PRESENTATION_TIPS[detectedLang];

  const TR: Record<'fr' | 'en' | 'ar', VideoRecorderTranslations> = {
    fr: {
      chooseModeTitle: 'Vidéo de présentation',
      chooseModeSubtitle:
        'Enregistrez 20 secondes en direct ou importez une vidéo existante depuis votre galerie.',
      cameraBtn: 'Enregistrer maintenant',
      cameraDesc: 'Utilisez la caméra de votre téléphone',
      uploadBtn: 'Importer une vidéo',
      uploadDesc: 'Depuis votre galerie ou vos fichiers',
      startRec: 'Appuyez pour démarrer (20s max)',
      stopRec: "Appuyez pour arrêter l'enregistrement",
      retake: 'Reprendre',
      camError: "Impossible d'accéder à la caméra. Vérifiez les permissions.",
      sec: 'sec',
      readyTitle: 'Prêt à enregistrer',
      reviewTitle: 'Votre vidéo',
      confirmBtn: 'Valider la vidéo',
      uploadBrowse: 'Vérification en cours…',
      videoTooLong: '⚠️ La vidéo dépasse 20 secondes. Veuillez sélectionner une vidéo plus courte.',
      videoTip: tip,
      permBlockedTitle: 'Activer caméra et micro',
      permBlockedDesc:
        "Autorisez l'accès à la caméra et au microphone pour enregistrer votre vidéo de présentation.",
      permBlockedRetry: 'Autoriser',
      permBlockedClose: 'Annuler',
      micRefused:
        'Microphone refusé. Autorisez le micro pour enregistrer votre vidéo de présentation.',
      invalidVideoFile: '⚠️ Fichier vidéo invalide.',
      chooseAnotherMethod: 'Choisir une autre méthode',
    },
    en: {
      chooseModeTitle: 'Presentation video',
      chooseModeSubtitle: 'Record 20 seconds live or import an existing video from your gallery.',
      cameraBtn: 'Record now',
      cameraDesc: 'Use your phone camera',
      uploadBtn: 'Upload a video',
      uploadDesc: 'From your gallery or files',
      startRec: 'Tap to start (20s max)',
      stopRec: 'Tap to stop recording',
      retake: 'Retake',
      camError: 'Cannot access camera. Please check permissions.',
      sec: 'sec',
      readyTitle: 'Ready to record',
      reviewTitle: 'Your video',
      confirmBtn: 'Confirm video',
      uploadBrowse: 'Checking file…',
      videoTooLong: '⚠️ Video exceeds 20 seconds. Please select a shorter video.',
      videoTip: tip,
      permBlockedTitle: 'Enable camera and microphone',
      permBlockedDesc: 'Allow camera and microphone access to record your presentation video.',
      permBlockedRetry: 'Allow',
      permBlockedClose: 'Cancel',
      micRefused: 'Microphone denied. Allow the microphone to record your presentation video.',
      invalidVideoFile: '⚠️ Invalid video file.',
      chooseAnotherMethod: 'Choose another method',
    },
    ar: {
      chooseModeTitle: 'فيديو التعريف',
      chooseModeSubtitle: 'سجّل 20 ثانية مباشرة أو استورد فيديو من معرض الصور الخاص بك.',
      cameraBtn: 'التسجيل الآن',
      cameraDesc: 'استخدم كاميرا هاتفك',
      uploadBtn: 'رفع فيديو',
      uploadDesc: 'من معرض الصور أو الملفات',
      startRec: 'اضغط للبدء (20 ث كحد أقصى)',
      stopRec: 'اضغط لإيقاف التسجيل',
      retake: 'إعادة التصوير',
      camError: 'لا يمكن الوصول إلى الكاميرا. تحقق من الأذونات.',
      sec: 'ث',
      readyTitle: 'جاهز للتسجيل',
      reviewTitle: 'فيديوك',
      confirmBtn: 'تأكيد الفيديو',
      uploadBrowse: 'جارٍ التحقق من الملف…',
      videoTooLong: '⚠️ الفيديو يتجاوز 20 ثانية. يرجى اختيار فيديو أقصر.',
      videoTip: tip,
      permBlockedTitle: 'تفعيل الكاميرا والميكروفون',
      permBlockedDesc: 'اسمح بالوصول إلى الكاميرا والميكروفون لتسجيل فيديو التعريف.',
      permBlockedRetry: 'السماح',
      permBlockedClose: 'إلغاء',
      micRefused: 'تم رفض الميكروفون. اسمح باستخدام الميكروفون لتسجيل فيديو التعريف.',
      invalidVideoFile: '⚠️ ملف الفيديو غير صالح.',
      chooseAnotherMethod: 'اختر طريقة أخرى',
    },
  };
  return TR[lang];
}

export function VideoRecorderModal({
  onVideoReady,
  onClose,
  tr,
  isRtl = false,
  voiceLang = 'fr-FR',
}: VideoRecorderModalProps) {
  const [phase, setPhase] = useState<Phase>('choose');
  const [countdown, setCountdown] = useState(MAX_DURATION);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [camError, setCamError] = useState<string | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentBlobUrl, setCurrentBlobUrl] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string>('');

  // Suppress voiceLang unused warning (kept for future use)
  void voiceLang;

  const liveRef = useRef<HTMLVideoElement>(null);
  const reviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const currentBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handedOffUrlRef = useRef(false);
  const recordedUrlRef = useRef<string | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  const stopRecorder = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const revokeTrackedUrls = useCallback(() => {
    if (handedOffUrlRef.current) return;
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
      recordedUrlRef.current = null;
    }
    if (currentBlobUrlRef.current && currentBlobUrlRef.current !== recordedUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
  }, []);

  const setTrackedRecordedUrl = (url: string | null) => {
    recordedUrlRef.current = url;
    setRecordedUrl(url);
  };

  const setTrackedBlobUrl = (url: string | null) => {
    currentBlobUrlRef.current = url;
    setCurrentBlobUrl(url);
  };

  const teardown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopRecorder();
    stopStream();
    revokeTrackedUrls();
    currentBlobRef.current = null;
  }, [revokeTrackedUrls, stopRecorder, stopStream]);

  const startCamera = useCallback(
    async (facing: 'user' | 'environment') => {
      stopStream();
      setCamError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: true,
        });
        streamRef.current = stream;
        if (liveRef.current) {
          liveRef.current.srcObject = stream;
        }
      } catch (error) {
        const name = (error as DOMException | undefined)?.name;
        if (
          name === 'NotAllowedError' ||
          name === 'SecurityError' ||
          name === 'PermissionDeniedError'
        ) {
          setPermissionBlocked(true);
        } else {
          setCamError(tr.camError);
        }
      }
    },
    [stopStream, tr.camError],
  );

  useEffect(() => {
    return () => {
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
  }, []);

  // Re-bind the live preview after the <video> mounts (phase → preview race).
  useEffect(() => {
    if ((phase === 'preview' || phase === 'recording') && liveRef.current && streamRef.current) {
      liveRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'review' && reviewRef.current && recordedUrl) {
      reviewRef.current.src = recordedUrl;
    }
  }, [phase, recordedUrl]);

  const handleClose = () => {
    teardown();
    onClose();
  };

  const handleChooseCamera = async () => {
    setPhase('preview');
    setCamError(null);
    setPermissionBlocked(false);

    if (Capacitor.isNativePlatform()) {
      const result = await checkAndRequestAvPermission();
      if (!result.ok) {
        setPermissionBlocked(true);
        if (result.reason === 'microphone') {
          setCamError(tr.micRefused);
        }
        return;
      }
      void startCamera('user');
      return;
    }

    // Web: call getUserMedia from the click gesture so Safari shows the prompt.
    void startCamera('user');
  };

  // Réessayer après que l'utilisateur a (dé)bloqué la permission dans ses réglages.
  const retryCameraPermission = () => {
    setPermissionBlocked(false);
    setCamError(null);
    void handleChooseCamera();
  };

  const dismissPermissionHelp = () => {
    setPermissionBlocked(false);
    setCamError(null);
    setPhase('choose');
    stopStream();
  };

  const handleChooseUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setPhase('uploading');

    const url = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.src = url;
    videoEl.onloadedmetadata = () => {
      if (videoEl.duration > MAX_DURATION) {
        URL.revokeObjectURL(url);
        setUploadError(tr.videoTooLong);
        setPhase('choose');
        e.target.value = '';
      } else {
        currentBlobRef.current = file;
        setTrackedBlobUrl(url);
        setCurrentFilename(file.name);
        setTrackedRecordedUrl(url);
        setTimeout(() => setPhase('review'), 600);
      }
    };
    videoEl.onerror = () => {
      URL.revokeObjectURL(url);
      setUploadError(tr.invalidVideoFile);
      setPhase('choose');
    };
  };

  const flipCamera = () => {
    if (phase === 'recording') return;
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    void startCamera(next);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=h264',
      'video/webm',
      'video/mp4',
    ].find((t) => {
      try {
        return MediaRecorder.isTypeSupported(t);
      } catch {
        return false;
      }
    });

    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current);
    } catch {
      setCamError(tr.camError);
      return;
    }

    const usedType = recorder.mimeType || mimeType || 'video/webm';

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blobType = usedType.split(';')[0].trim() || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: blobType });
      const url = URL.createObjectURL(blob);
      const ext = blobType.includes('mp4') ? 'mp4' : 'webm';
      const fname = `matchy_video_${Date.now()}.${ext}`;
      currentBlobRef.current = blob;
      setTrackedRecordedUrl(url);
      setTrackedBlobUrl(url);
      setCurrentFilename(fname);
      setPhase('review');
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recorderRef.current = recorder;
    try {
      recorder.start(200);
    } catch {
      setCamError(tr.camError);
      recorderRef.current = null;
      return;
    }
    setPhase('recording');
    setCountdown(MAX_DURATION);

    let rem = MAX_DURATION;
    timerRef.current = setInterval(() => {
      rem -= 1;
      setCountdown(rem);
      if (rem <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      }
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const retake = () => {
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
    }
    if (currentBlobUrlRef.current && currentBlobUrlRef.current !== recordedUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
    }
    recordedUrlRef.current = null;
    currentBlobUrlRef.current = null;
    setTrackedRecordedUrl(null);
    setTrackedBlobUrl(null);
    currentBlobRef.current = null;
    setPhase('preview');
    setCountdown(MAX_DURATION);
    void startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (currentBlobRef.current && currentBlobUrl && currentFilename) {
      handedOffUrlRef.current = true;
      onVideoReady(currentBlobRef.current, currentBlobUrl, currentFilename);
    }
  };

  const handleRetakeAll = () => {
    if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
    if (currentBlobUrlRef.current && currentBlobUrlRef.current !== recordedUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
    }
    recordedUrlRef.current = null;
    currentBlobUrlRef.current = null;
    setTrackedRecordedUrl(null);
    setTrackedBlobUrl(null);
    currentBlobRef.current = null;
    setUploadError(null);
    setPhase('choose');
    stopStream();
  };

  const progress = countdown / MAX_DURATION;
  const dashoffset = CIRC * (1 - progress);
  const isLow = countdown <= 5;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: '#050505' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Header ── */}
      <div className="absolute top-0 right-0 left-0 z-20 flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={handleClose}
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <X size={20} color="white" />
        </button>

        <div
          className="flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
          >
            <Mic size={10} color="white" />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: 700 }}>
            20s max
          </span>
        </div>

        {phase === 'preview' ? (
          <button
            type="button"
            onClick={flipCamera}
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            aria-label="Retourner la caméra"
          >
            <FlipHorizontal size={18} color="white" />
          </button>
        ) : (
          <div className="w-11" />
        )}
      </div>

      {/* ── CHOOSE PHASE ── */}
      {phase === 'choose' && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pt-16 pb-10">
          <div
            className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
          >
            <Video size={44} color="white" />
          </div>

          <h1
            style={{
              color: 'white',
              fontSize: '22px',
              fontWeight: 800,
              textAlign: 'center',
              marginBottom: '10px',
            }}
          >
            {tr.chooseModeTitle}
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '13px',
              textAlign: 'center',
              lineHeight: 1.65,
              marginBottom: '32px',
            }}
          >
            {tr.chooseModeSubtitle}
          </p>

          {/* Tip */}
          <div
            className="mb-8 w-full rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(97,188,166,0.12)',
              border: '1px solid rgba(97,188,166,0.25)',
            }}
          >
            <div className="flex items-start gap-2">
              <span style={{ fontSize: '14px' }}>💡</span>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: 1.6 }}>
                {tr.videoTip}
              </p>
            </div>
          </div>

          {/* Upload error */}
          {uploadError && (
            <div
              className="mb-4 flex w-full items-center gap-2 rounded-2xl px-4 py-3"
              style={{
                background: 'rgba(231,76,60,0.12)',
                border: '1px solid rgba(231,76,60,0.3)',
              }}
            >
              <AlertCircle size={16} color="#E74C3C" />
              <p style={{ color: '#E74C3C', fontSize: '12px' }}>{uploadError}</p>
            </div>
          )}

          <div className="w-full space-y-3">
            <button
              onClick={handleChooseCamera}
              className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #61BCA6, #2F76BB)',
                boxShadow: '0 4px 20px rgba(47,118,187,0.4)',
              }}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <Camera size={22} color="white" />
              </div>
              <div className={isRtl ? 'flex-1 text-right' : 'flex-1 text-left'}>
                <p style={{ color: 'white', fontWeight: 800, fontSize: '15px' }}>{tr.cameraBtn}</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '2px' }}>
                  {tr.cameraDesc}
                </p>
              </div>
              <ChevronRight
                size={18}
                color="rgba(255,255,255,0.6)"
                style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }}
              />
            </button>

            <button
              onClick={handleChooseUpload}
              className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(255,255,255,0.15)',
              }}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <Upload size={22} color="rgba(255,255,255,0.8)" />
              </div>
              <div className={isRtl ? 'flex-1 text-right' : 'flex-1 text-left'}>
                <p style={{ color: 'white', fontWeight: 800, fontSize: '15px' }}>{tr.uploadBtn}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px' }}>
                  {tr.uploadDesc}
                </p>
              </div>
              <ChevronRight
                size={18}
                color="rgba(255,255,255,0.4)"
                style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }}
              />
            </button>
          </div>
        </div>
      )}

      {/* ── UPLOADING PHASE ── */}
      {phase === 'uploading' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
          >
            <Video size={36} color="white" />
          </div>
          <p style={{ color: 'white', fontSize: '16px', fontWeight: 700, textAlign: 'center' }}>
            {tr.uploadBrowse}
          </p>
          <div
            className="h-1.5 w-48 overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <div
              className="h-full animate-pulse rounded-full"
              style={{ width: '60%', background: 'linear-gradient(90deg, #61BCA6, #2F76BB)' }}
            />
          </div>
        </div>
      )}

      {/* ── CAMERA PREVIEW ── */}
      {(phase === 'preview' || phase === 'recording') && (
        <div className="relative flex flex-1 flex-col">
          {/* Live video */}
          <video
            ref={liveRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />

          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.8) 100%)',
            }}
          />

          {/* Error */}
          {camError && (
            <div className="absolute inset-0 flex items-center justify-center px-8">
              <div
                className="flex flex-col items-center gap-3 rounded-2xl p-5"
                style={{ background: 'rgba(0,0,0,0.85)' }}
              >
                <AlertCircle size={32} color="#E74C3C" />
                <p
                  style={{ color: 'white', fontSize: '14px', fontWeight: 600, textAlign: 'center' }}
                >
                  {camError}
                </p>
              </div>
            </div>
          )}

          {/* Timer ring (recording) */}
          {phase === 'recording' && (
            <div className="absolute top-16 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
              <div className="relative h-28 w-28">
                <svg width="112" height="112" viewBox="0 0 120 120" className="absolute inset-0">
                  <circle
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="5"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    stroke={isLow ? '#E74C3C' : '#61BCA6'}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={dashoffset}
                    style={{
                      transformOrigin: 'center',
                      transform: 'rotate(-90deg)',
                      transition: 'stroke-dashoffset 0.9s linear',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    style={{
                      color: isLow ? '#E74C3C' : 'white',
                      fontSize: '32px',
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {countdown}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{tr.sec}</span>
                </div>
              </div>
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1"
                style={{ background: 'rgba(231,76,60,0.9)' }}
              >
                <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                <span style={{ color: 'white', fontSize: '12px', fontWeight: 700 }}>REC</span>
              </div>
            </div>
          )}

          {/* Bottom controls */}
          <div className="absolute right-0 bottom-0 left-0 px-6 pb-10">
            {phase === 'preview' && (
              <div className="flex flex-col items-center gap-3">
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{tr.readyTitle}</p>
                <button
                  onClick={startRecording}
                  className="flex h-20 w-20 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{
                    background: 'linear-gradient(135deg, #61BCA6, #2F76BB)',
                    boxShadow: '0 0 0 6px rgba(97,188,166,0.3)',
                  }}
                >
                  <div className="h-8 w-8 rounded-full bg-white" />
                </button>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{tr.startRec}</p>
              </div>
            )}
            {phase === 'recording' && (
              <div className="flex flex-col items-center gap-3">
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>{tr.stopRec}</p>
                <button
                  onClick={stopRecording}
                  className="flex h-20 w-20 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ background: '#E74C3C', boxShadow: '0 0 0 6px rgba(231,76,60,0.3)' }}
                >
                  <div className="h-8 w-8 rounded-lg bg-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REVIEW PHASE ── */}
      {phase === 'review' && (
        <div className="flex flex-1 flex-col">
          <div className="relative flex-1">
            <video
              ref={reviewRef}
              controls
              playsInline
              className="absolute inset-0 h-full w-full object-contain"
              style={{ background: '#000' }}
            />
          </div>

          <div className="space-y-3 px-6 pt-5 pb-8" style={{ background: '#111' }}>
            <p style={{ color: 'white', fontSize: '16px', fontWeight: 700, textAlign: 'center' }}>
              {tr.reviewTitle}
            </p>

            {/* Confirm */}
            <button
              onClick={handleConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-white transition-all active:scale-95"
              style={{
                background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
                fontSize: '15px',
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(47,118,187,0.4)',
              }}
            >
              <Check size={18} />
              {tr.confirmBtn}
            </button>

            {/* Retake */}
            <button
              onClick={retake}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <RotateCcw size={16} color="rgba(255,255,255,0.7)" />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600 }}>
                {tr.retake}
              </span>
            </button>

            <button
              onClick={handleRetakeAll}
              className="flex w-full items-center justify-center py-2.5"
            >
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                {tr.chooseAnotherMethod}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── CAMERA PERMISSION BLOCKED — custom in-app help popup ── */}
      {permissionBlocked && (
        <div
          className="absolute inset-0 z-[110] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6"
            style={{ background: '#15171b', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
            >
              <Camera size={26} color="white" />
            </div>

            <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
              {tr.permBlockedTitle}
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                lineHeight: 1.6,
                marginBottom: '24px',
              }}
            >
              {tr.permBlockedDesc}
            </p>

            <button
              onClick={retryCameraPermission}
              className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white transition-all active:scale-95"
              style={{
                background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
                fontSize: '15px',
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(47,118,187,0.4)',
              }}
            >
              <RotateCcw size={17} />
              {tr.permBlockedRetry}
            </button>
            <button
              onClick={dismissPermissionHelp}
              className="w-full rounded-2xl py-3 transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600 }}>
                {tr.permBlockedClose}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
