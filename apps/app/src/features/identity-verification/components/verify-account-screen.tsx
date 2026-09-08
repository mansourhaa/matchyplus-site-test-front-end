'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  fetchIdentityVerificationStatus,
  fetchLatestIdentityVerification,
  resetIdentityVerification,
  selectIdentityVerification,
  submitIdentitySelfie,
} from '@/features/identity-verification/store/identity-verification-slice';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Scan,
  Shield,
  ShieldCheck,
  Smile,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 15;
const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);

export function VerifyAccountScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { locale, t, dir } = useI18n();
  const isRtl = locale === 'ar';

  const { user } = useAppSelector(selectAuth);
  const { job, identityVerified, submitting, restored, error } = useAppSelector(
    selectIdentityVerification,
  );

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [timeoutError, setTimeoutError] = useState<string | null>(null);
  const pollAttemptsRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const alreadyVerified = identityVerified || Boolean(user?.verified);
  const isProcessing = submitting || (Boolean(job) && !TERMINAL_STATUSES.has(job!.status));

  // Initial fetch of verification state
  useEffect(() => {
    if (restored) return;
    void dispatch(fetchLatestIdentityVerification());
  }, [restored, dispatch]);

  // Polling while verification job is running
  useEffect(() => {
    if (!job || TERMINAL_STATUSES.has(job.status)) return;

    if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
      setTimeoutError(
        locale === 'en'
          ? 'Verification is taking longer than expected. Please retry in a few moments.'
          : locale === 'ar'
            ? 'يستغرق التحقق وقتاً أطول من المتوقع. يرجى إعادة المحاولة لاحقاً.'
            : 'La vérification prend plus de temps que prévu. Veuillez réessayer dans quelques instants.',
      );
      return;
    }

    const timer = window.setTimeout(() => {
      pollAttemptsRef.current += 1;
      void dispatch(fetchIdentityVerificationStatus(job.id));
    }, POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [job, dispatch, locale]);

  // Stream cleanup
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Open camera
  const openCamera = async () => {
    setCameraError(null);
    setTimeoutError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setCameraError(
        locale === 'en'
          ? 'Cannot access camera. Please allow camera permissions.'
          : locale === 'ar'
            ? 'تعذر الوصول إلى الكاميرا. يرجى تفعيل إذن الوصول للكاميرا.'
            : "Impossible d'accéder à la caméra. Veuillez autoriser l'accès.",
      );
    }
  };

  // Bind stream to video element once mounted
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  // Capture selfie and submit
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopStream();
        setCameraOpen(false);
        pollAttemptsRef.current = 0;
        setTimeoutError(null);
        void dispatch(submitIdentitySelfie(blob));
      },
      'image/jpeg',
      0.9,
    );
  };

  const handleCloseCamera = () => {
    stopStream();
    setCameraOpen(false);
  };

  const handleRetry = () => {
    stopStream();
    setCameraOpen(false);
    pollAttemptsRef.current = 0;
    setTimeoutError(null);
    dispatch(resetIdentityVerification());
    void openCamera();
  };

  // Confidence calculation
  const confidenceScore =
    job?.result && typeof job.result === 'object'
      ? (job.result as Record<string, unknown>).matchScore != null
        ? Math.round(Number((job.result as Record<string, unknown>).matchScore) * 100)
        : (job.result as Record<string, unknown>).confidence != null
          ? Math.round(Number((job.result as Record<string, unknown>).confidence) * 100)
          : (job.result as Record<string, unknown>).distance != null &&
              (job.result as Record<string, unknown>).threshold != null
            ? Math.round(
                Math.max(
                  55,
                  Math.min(
                    99,
                    (1 -
                      Number((job.result as Record<string, unknown>).distance) /
                        (Number((job.result as Record<string, unknown>).threshold) * 1.6)) *
                      100,
                  ),
                ),
              )
            : 68
      : 68;

  const failed =
    Boolean(error) ||
    Boolean(timeoutError) ||
    job?.status === 'FAILED' ||
    (job?.status === 'SUCCEEDED' && !identityVerified && !user?.verified);

  const noFaceDetected = job?.result?.code === 'no_face_detected';

  return (
    <div
      className="flex h-full min-h-[calc(100vh-100px)] w-full max-w-md flex-col items-center justify-between py-6 text-center md:py-10"
      dir={dir}
    >
      {/* 2. Main Title & Subtitle */}
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#2F76BB] sm:text-3xl">
          {locale === 'en'
            ? 'Protect your account'
            : locale === 'ar'
              ? 'حماية حسابك'
              : 'Protéger votre compte'}
        </h2>
        <p className="mt-2 text-xs leading-relaxed font-medium text-[#64748B] sm:text-sm">
          {locale === 'en'
            ? 'Your live capture will be compared to your profile photo via facial recognition.'
            : locale === 'ar'
              ? 'ستتم مقارنة التقاطك المباشر بصورة ملفك الشخصي عبر تقنية التعرف على الوجه.'
              : 'Votre capture live sera comparée à votre photo de profil via la reconnaissance faciale.'}
        </p>
      </div>

      {/* 3. Center Scanner / Frame Container */}
      <div className="flex justify-center">
        <div
          className="relative flex h-[340px] w-[280px] items-center justify-center overflow-hidden rounded-3xl bg-[#F8FAFC] sm:h-[400px] sm:w-[320px]"
          style={{ border: '1px dashed #B8D8F8' }}
        >
          {/* Top-Left Corner Marker */}
          <div className="absolute top-4 left-4 z-20 h-7 w-7 rounded-tl-lg border-t-[3px] border-l-[3px] border-[#2F76BB]" />
          {/* Top-Right Corner Marker */}
          <div className="absolute top-4 right-4 z-20 h-7 w-7 rounded-tr-lg border-t-[3px] border-r-[3px] border-[#2F76BB]" />
          {/* Bottom-Left Corner Marker */}
          <div className="absolute bottom-4 left-4 z-20 h-7 w-7 rounded-bl-lg border-b-[3px] border-l-[3px] border-[#2F76BB]" />
          {/* Bottom-Right Corner Marker */}
          <div className="absolute right-4 bottom-4 z-20 h-7 w-7 rounded-br-lg border-r-[3px] border-b-[3px] border-[#2F76BB]" />

          {/* Crosshair Ticks */}
          <div className="absolute top-2 left-1/2 z-20 h-3 w-[2px] -translate-x-1/2 bg-[#2F76BB]" />
          <div className="absolute bottom-2 left-1/2 z-20 h-3 w-[2px] -translate-x-1/2 bg-[#2F76BB]" />
          <div className="absolute top-1/2 left-2 z-20 h-[2px] w-3 -translate-y-1/2 bg-[#2F76BB]" />
          <div className="absolute top-1/2 right-2 z-20 h-[2px] w-3 -translate-y-1/2 bg-[#2F76BB]" />

          {/* Frame Content: Camera Stream or Polygonal Face Wireframe */}
          {cameraOpen ? (
            /* Live Camera Video Stream */
            <div className="relative h-full w-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full rounded-3xl object-cover"
              />
              {/* Subtle face mesh overlay over live camera */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
                <svg
                  viewBox="0 0 220 280"
                  className="h-48 w-48"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                >
                  <polygon points="110,24 172,52 200,118 190,190 110,264 30,190 20,118 48,52" />
                  <line x1="110" y1="24" x2="110" y2="264" />
                </svg>
              </div>

              {/* Scanning Animation Line during analysis */}
              {isProcessing && (
                <motion.div
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#61BCA6] to-transparent shadow-[0_0_8px_#61BCA6]"
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                />
              )}
            </div>
          ) : (
            /* Polygonal Face Wireframe Template (Enhanced Wider High-Fidelity Clone) */
            <div className="relative flex flex-col items-center justify-center pt-1 pb-7">
              <svg
                viewBox="0 0 220 280"
                className="h-56 w-56 drop-shadow-xs sm:h-60 sm:w-60"
                fill="none"
                stroke="#61BCA6"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* 1. Outer Polygonal Face Contour (Wider Proportions) */}
                <polygon
                  points="110,24 172,52 200,118 190,190 110,264 30,190 20,118 48,52"
                  stroke="#61BCA6"
                  strokeWidth="2.2"
                />

                {/* 2. Main Center Vertical Symmetry Axis */}
                <line x1="110" y1="24" x2="110" y2="264" stroke="#61BCA6" strokeWidth="2" />

                {/* 3. Forehead Facet Triangulation */}
                <line x1="48" y1="52" x2="110" y2="92" />
                <line x1="172" y1="52" x2="110" y2="92" />

                {/* 4. Brow Arc & Upper Nose Bridge */}
                <line x1="110" y1="92" x2="62" y2="118" />
                <line x1="110" y1="92" x2="158" y2="118" />
                <line x1="62" y1="118" x2="110" y2="134" />
                <line x1="158" y1="118" x2="110" y2="134" />

                {/* 5. Inner Eye Angle Lines */}
                <line x1="56" y1="126" x2="110" y2="150" />
                <line x1="164" y1="126" x2="110" y2="150" />
                <line x1="56" y1="126" x2="94" y2="106" />
                <line x1="164" y1="126" x2="126" y2="106" />

                {/* 6. Cheekbone & Midface Planes */}
                <line x1="20" y1="118" x2="110" y2="164" />
                <line x1="200" y1="118" x2="110" y2="164" />
                <line x1="30" y1="190" x2="110" y2="164" />
                <line x1="190" y1="190" x2="110" y2="164" />

                {/* 7. Lower Jaw & Chin Diamond Mesh */}
                <line x1="30" y1="190" x2="110" y2="224" />
                <line x1="190" y1="190" x2="110" y2="224" />
                <line x1="110" y1="224" x2="110" y2="264" />
                <line x1="30" y1="190" x2="110" y2="264" />
                <line x1="190" y1="190" x2="110" y2="264" />

                {/* 8. Vertex Intersection Anchor Dots */}
                <circle cx="110" cy="24" r="2.2" fill="#61BCA6" stroke="white" strokeWidth="1" />
                <circle cx="48" cy="52" r="2" fill="#61BCA6" />
                <circle cx="172" cy="52" r="2" fill="#61BCA6" />
                <circle cx="20" cy="118" r="2" fill="#61BCA6" />
                <circle cx="200" cy="118" r="2" fill="#61BCA6" />
                <circle cx="110" cy="92" r="2" fill="#61BCA6" />
                <circle cx="110" cy="134" r="2" fill="#61BCA6" />
                <circle cx="110" cy="164" r="2.2" fill="#61BCA6" stroke="white" strokeWidth="1" />
                <circle cx="30" cy="190" r="2" fill="#61BCA6" />
                <circle cx="190" cy="190" r="2" fill="#61BCA6" />
                <circle cx="110" cy="224" r="2" fill="#61BCA6" />
                <circle cx="110" cy="264" r="2.5" fill="#61BCA6" stroke="white" strokeWidth="1" />
              </svg>

              {/* Face Scan Badge at Chin Bottom */}
              <div className="absolute -bottom-3 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-[#EBF4FC] shadow-sm">
                <div className="relative flex h-6 w-6 items-center justify-center">
                  {/* Mini Corner Brackets */}
                  <span className="absolute top-0 left-0 h-1.5 w-1.5 rounded-[1px] border-t-[1.5px] border-l-[1.5px] border-[#2F76BB]" />
                  <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-[1px] border-t-[1.5px] border-r-[1.5px] border-[#2F76BB]" />
                  <span className="absolute bottom-0 left-0 h-1.5 w-1.5 rounded-[1px] border-b-[1.5px] border-l-[1.5px] border-[#2F76BB]" />
                  <span className="absolute right-0 bottom-0 h-1.5 w-1.5 rounded-[1px] border-r-[1.5px] border-b-[1.5px] border-[#2F76BB]" />
                  {/* Smiling Face Inside */}
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                    <circle cx="5" cy="6" r="0.9" fill="#2F76BB" />
                    <circle cx="11" cy="6" r="0.9" fill="#2F76BB" />
                    <path
                      d="M5 9.5C6 11.2 10 11.2 11 9.5"
                      stroke="#2F76BB"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Instructions under frame when camera is active */}
      {cameraOpen && !isProcessing && (
        <p className="text-center text-xs font-semibold text-[#64748B]">
          {locale === 'en'
            ? 'Align your face inside the frame and tap Verify now.'
            : locale === 'ar'
              ? 'قم بمحاذاة وجهك داخل الإطار ثم اضغط على التحقق الآن.'
              : 'Alignez votre visage dans le cadre puis appuyez sur Vérifier maintenant.'}
        </p>
      )}

      {/* 5. Status Banner (Success, Processing, or Failure) */}
      <AnimatePresence mode="wait">
        {alreadyVerified && !cameraOpen && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-[#61BCA6] bg-[#E8F8F5] p-4"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#61BCA6] text-white">
              <Check size={16} strokeWidth={3} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1A1A2E]">
                {locale === 'en'
                  ? 'Your account is now verified.'
                  : locale === 'ar'
                    ? 'تم توثيق حسابك بنجاح.'
                    : 'Votre compte est maintenant vérifié.'}
              </p>
              <p className="text-xs text-[#64748B]">
                {locale === 'en'
                  ? `Confidence: ${confidenceScore}%`
                  : locale === 'ar'
                    ? `نسبة التطابق: ${confidenceScore}%`
                    : `Confidence: ${confidenceScore}%`}
              </p>
            </div>
          </motion.div>
        )}

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-[#D0E3F8] bg-[#F0F7FF] p-4"
          >
            <Loader2 size={20} className="shrink-0 animate-spin text-[#2F76BB]" />
            <div>
              <p className="text-sm font-bold text-[#1A1A2E]">
                {locale === 'en'
                  ? 'Analyzing face…'
                  : locale === 'ar'
                    ? 'جارٍ تحليل الوجه…'
                    : 'Analyse faciale en cours…'}
              </p>
              <p className="text-xs text-[#64748B]">
                {locale === 'en'
                  ? 'Comparing with your profile photo via AI.'
                  : locale === 'ar'
                    ? 'تتم المقارنة بصورة ملفك الشخصي عبر الذكاء الاصطناعي.'
                    : 'Comparaison avec votre photo de profil via IA.'}
              </p>
            </div>
          </motion.div>
        )}

        {failed && !cameraOpen && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-[#FF6B6B] bg-[#FFF0F0] p-4"
          >
            <AlertCircle size={20} className="shrink-0 text-[#FF6B6B]" />
            <div>
              <p className="text-sm font-bold text-[#991B1B]">
                {noFaceDetected
                  ? locale === 'en'
                    ? 'No face detected in capture'
                    : locale === 'ar'
                      ? 'لم يتم التعرف على وجه في الصورة'
                      : 'Aucun visage détecté'
                  : locale === 'en'
                    ? 'Verification failed'
                    : locale === 'ar'
                      ? 'فشل التحقق من الهوية'
                      : 'Échec de la vérification'}
              </p>
              <p className="text-xs text-[#B91C1C]">
                {timeoutError ||
                  error ||
                  (noFaceDetected
                    ? locale === 'en'
                      ? 'Please position your face clearly in good lighting and try again.'
                      : locale === 'ar'
                        ? 'يرجى وضع وجهك بوضوح في إضاءة جيدة والمحاولة مرة أخرى.'
                        : 'Veuillez bien centrer votre visage avec un éclairage suffisant et réessayer.'
                    : locale === 'en'
                      ? 'Selfie does not match the profile picture. Please try again.'
                      : locale === 'ar'
                        ? 'الصورة الملتقطة لا تطابق صورة الملف الشخصي. يرجى المحاولة مجدداً.'
                        : 'Le selfie ne correspond pas à votre photo de profil. Veuillez réessayer.')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Action Buttons */}
      <div className="w-full max-w-[280px] space-y-3 pt-2 sm:max-w-[320px]">
        {alreadyVerified && !cameraOpen && !isProcessing ? (
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: matchyBrand.gradient }}
          >
            <Camera size={18} />
            {locale === 'en' ? 'Finish' : locale === 'ar' ? 'إنهاء' : 'Terminer'}
          </button>
        ) : cameraOpen ? (
          <>
            <button
              type="button"
              onClick={handleCapture}
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              style={{ background: matchyBrand.gradient }}
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
              {locale === 'en'
                ? 'Verify now'
                : locale === 'ar'
                  ? 'التحقق الآن'
                  : 'Vérifier maintenant'}
            </button>
            <button
              type="button"
              onClick={handleCloseCamera}
              disabled={isProcessing}
              className="w-full py-2.5 text-center text-[14px] font-semibold text-[#64748B] hover:text-[#1A1A2E]"
            >
              {locale === 'en'
                ? 'Close camera'
                : locale === 'ar'
                  ? 'إغلاق الكاميرا'
                  : 'Fermer la caméra'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void openCamera()}
            disabled={isProcessing}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            style={{ background: matchyBrand.gradient }}
          >
            <Camera size={18} />
            {failed
              ? locale === 'en'
                ? 'Retry verification'
                : locale === 'ar'
                  ? 'إعادة محاولة التحقق'
                  : 'Réessayer la vérification'
              : locale === 'en'
                ? 'Open camera'
                : locale === 'ar'
                  ? 'فتح الكاميرا'
                  : 'Ouvrir la caméra'}
          </button>
        )}

        {cameraError && (
          <p className="text-center text-xs text-[#E74C3C]" role="alert">
            {cameraError}
          </p>
        )}
      </div>
    </div>
  );
}
