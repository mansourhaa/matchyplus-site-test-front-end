'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  VideoRecorderModal,
  buildVideoRecorderTr,
} from '@/features/onboarding/components/video-recorder-modal';
import {
  fetchOnboardingProfile,
  patchOnboardingProfile,
  selectOnboarding,
} from '@/features/onboarding/store/onboarding-slice';
import { humanizeMediaError } from '@/features/profile/media-errors';
import {
  deleteProfileVideo,
  selectProfile,
  uploadProfileVideo,
} from '@/features/profile/store/profile-slice';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { AlertCircle, Film, Play, Trash2, Video, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function VideoSettingsView() {
  const dispatch = useAppDispatch();
  const { locale, t } = useI18n();
  const isRtl = locale === 'ar';
  const { profile, loading, error: profileError } = useAppSelector(selectOnboarding);
  const { mediaUploading, mediaError } = useAppSelector(selectProfile);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const serverVideo = profile?.video ?? null;
  const authenticated = useAuthenticatedMediaUrl(serverVideo, { stream: true });

  useEffect(() => {
    dispatch(fetchOnboardingProfile());
  }, [dispatch]);

  useEffect(
    () => () => {
      if (localPreview?.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(localPreview);
      }
    },
    [localPreview],
  );

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 3000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const showToast = () => {
    setSaved(true);
  };

  const handleVideoReady = async (blob: Blob, blobUrl: string, filename: string) => {
    setShowRecorder(false);
    setClientError(null);
    setPlaybackError(false);
    setPlaying(false);
    setLocalPreview((previous) => {
      if (previous && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(previous);
      return blobUrl;
    });

    const file = new File([blob], filename, { type: blob.type || 'video/webm' });
    const result = await dispatch(uploadProfileVideo(file));
    if (uploadProfileVideo.fulfilled.match(result)) {
      dispatch(patchOnboardingProfile({ video: result.payload.video ?? null }));
      dispatch(fetchOnboardingProfile());
      showToast();
      return;
    }
    setLocalPreview((previous) => {
      if (previous?.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
  };

  const handleRemove = async () => {
    setClientError(null);
    const result = await dispatch(deleteProfileVideo());
    if (deleteProfileVideo.fulfilled.match(result)) {
      setLocalPreview(null);
      dispatch(patchOnboardingProfile({ video: null }));
      dispatch(fetchOnboardingProfile());
      setPlaying(false);
      setPlaybackError(false);
    }
  };

  const previewUrl = localPreview || authenticated.url;
  const hasVideo = Boolean(localPreview || serverVideo);
  const startPreview = () => {
    const video = videoRef.current;
    if (!video || !previewUrl) return;
    video.muted = false;
    void video.play().then(() => setPlaying(true));
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-sm text-[#777]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2F76BB] border-t-transparent" />
        <p className="mt-3">
          {locale === 'en'
            ? 'Loading video...'
            : locale === 'ar'
              ? 'جارٍ التحميل...'
              : 'Chargement de la vidéo…'}
        </p>
      </div>
    );
  }

  if (profileError && !profile) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm" role="alert">
        <p className="text-sm text-[#E24E59]">
          {locale === 'en'
            ? 'Unable to load profile.'
            : locale === 'ar'
              ? 'تعذر تحميل الملف الشخصي.'
              : 'Impossible de charger votre profil.'}
        </p>
        <button
          type="button"
          onClick={() => dispatch(fetchOnboardingProfile())}
          className="mt-4 rounded-xl bg-[#2F76BB] px-5 py-2.5 text-sm font-bold text-white"
        >
          {t('common.retry') || 'Réessayer'}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3" dir={isRtl ? 'rtl' : 'ltr'}>
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F0FA]">
            <Film size={18} color={matchyBrand.blue} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#353535]">
              {locale === 'en'
                ? 'Presentation Video'
                : locale === 'ar'
                  ? 'فيديو العرض التقديمي'
                  : 'Vidéo de présentation'}
            </h2>
            <p className="text-[11px] text-[#888]">
              {locale === 'en'
                ? 'Max length: 20 seconds'
                : locale === 'ar'
                  ? 'المدة الأقصى: 20 ثانية'
                  : 'Durée max : 20 secondes'}
            </p>
          </div>
        </div>

        {hasVideo ? (
          <div>
            <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-xl bg-[#1A1A2E]">
              {previewUrl ? (
                <video
                  key={previewUrl}
                  ref={videoRef}
                  src={previewUrl}
                  className="h-full w-full object-cover"
                  controls={playing}
                  playsInline
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  onLoadedMetadata={() => setPlaybackError(false)}
                  onError={() => setPlaybackError(true)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-white/70">
                  {authenticated.loading
                    ? locale === 'en'
                      ? 'Loading video...'
                      : locale === 'ar'
                        ? 'جارٍ تحميل الفيديو...'
                        : 'Chargement de la vidéo…'
                    : locale === 'en'
                      ? 'Video unavailable'
                      : locale === 'ar'
                        ? 'الفيديو غير متاح'
                        : 'Vidéo inaccessible'}
                </div>
              )}
              {!playing && previewUrl && (
                <button
                  type="button"
                  onClick={startPreview}
                  className="absolute inset-0 flex items-center justify-center bg-black/30"
                  aria-label={
                    locale === 'en'
                      ? 'Play video'
                      : locale === 'ar'
                        ? 'تشغيل الفيديو'
                        : 'Lire la vidéo'
                  }
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90">
                    <Play size={22} color={matchyBrand.blue} fill={matchyBrand.blue} />
                  </span>
                </button>
              )}
              <span
                className={`absolute top-2 ${isRtl ? 'left-2' : 'right-2'} flex items-center gap-1 rounded-full bg-[#61BCA6] px-2 py-1 text-[10px] font-bold text-white`}
              >
                <Zap size={10} />{' '}
                {locale === 'en' ? 'Added ✓' : locale === 'ar' ? 'تمت الإضافة ✓' : 'Ajoutée ✓'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowRecorder(true)}
                disabled={mediaUploading}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#E8F0FA] py-2.5 text-[13px] font-bold text-[#2F76BB] disabled:opacity-60"
              >
                <Video size={14} />
                {mediaUploading
                  ? locale === 'en'
                    ? 'Uploading...'
                    : locale === 'ar'
                      ? 'جارٍ الرفع...'
                      : 'Envoi en cours…'
                  : locale === 'en'
                    ? 'Replace video'
                    : locale === 'ar'
                      ? 'استبدال الفيديو'
                      : 'Remplacer la vidéo'}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={mediaUploading}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#FFF0F0] py-2.5 text-[13px] font-bold text-[#FF6B6B] disabled:opacity-60"
                aria-label={
                  locale === 'en'
                    ? 'Delete video'
                    : locale === 'ar'
                      ? 'حذف الفيديو'
                      : 'Supprimer la vidéo'
                }
              >
                <Trash2 size={14} />{' '}
                {locale === 'en' ? 'Delete' : locale === 'ar' ? 'حذف' : 'Supprimer'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowRecorder(true)}
            disabled={mediaUploading}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#B8D8F8] bg-gradient-to-b from-[#F5F9FF] to-white py-10 text-[#888] transition-all hover:border-[#2F76BB] hover:bg-[#EEF5FF] disabled:opacity-60"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F0FA] shadow-sm">
              <Video size={28} color={matchyBrand.blue} />
            </span>
            <span className="px-4 text-center">
              <span className="block text-base font-extrabold text-[#2F76BB]">
                {locale === 'en'
                  ? 'Record or import'
                  : locale === 'ar'
                    ? 'تسجيل أو استيراد'
                    : 'Enregistrer ou importer'}
              </span>
              <span className="mt-1 block text-xs text-[#777]">
                {mediaUploading
                  ? locale === 'en'
                    ? 'Uploading...'
                    : locale === 'ar'
                      ? 'جارٍ الرفع...'
                      : 'Envoi en cours…'
                  : locale === 'en'
                    ? 'Camera recording or MP4 upload · Max 20 seconds'
                    : locale === 'ar'
                      ? 'تسجيل من الكاميرا أو رفع فيديو MP4 · 20 ثانية كحد أقصى'
                      : 'Caméra ou import MP4 · 20s max'}
              </span>
            </span>
          </button>
        )}

        {(clientError || mediaError || authenticated.error || playbackError) && (
          <p className="mt-2 text-xs text-[#E74C3C]" role="alert">
            {clientError ||
              (authenticated.error || playbackError
                ? locale === 'en'
                  ? 'This video is unavailable.'
                  : locale === 'ar'
                    ? 'هذا الفيديو غير متاح.'
                    : 'Cette vidéo est inaccessible.'
                : humanizeMediaError(mediaError)) ||
              (locale === 'en'
                ? 'Video error.'
                : locale === 'ar'
                  ? 'خطأ في الفيديو.'
                  : 'Échec de la vidéo.')}
          </p>
        )}
      </section>

      <aside className="rounded-2xl border border-[#D0E4F7] bg-[#EEF5FF] p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} color={matchyBrand.blue} className="mt-0.5 shrink-0" />
          <p className="text-xs leading-5 text-[#2F76BB]">
            {locale === 'en'
              ? 'A presentation video increases your match chances by up to 3×.'
              : locale === 'ar'
                ? 'فيديو العرض التقديمي يزيد فرص المطابقة لديك حتى 3 أضعاف.'
                : "Une vidéo de présentation augmente vos chances de match jusqu'à 3×."}
          </p>
        </div>
      </aside>

      {saved && (
        <div
          className={`fixed ${isRtl ? 'left-4' : 'right-4'} bottom-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-white shadow-lg md:w-80`}
          style={{ background: matchyBrand.gradient }}
          role="status"
        >
          <Zap size={18} />
          <span className="text-[13px] font-bold">
            {locale === 'en'
              ? '✓ Video saved successfully!'
              : locale === 'ar'
                ? '✓ تم حفظ الفيديو بنجاح!'
                : '✓ Vidéo enregistrée avec succès !'}
          </span>
        </div>
      )}

      {showRecorder && (
        <VideoRecorderModal
          onVideoReady={handleVideoReady}
          onClose={() => setShowRecorder(false)}
          tr={buildVideoRecorderTr(
            locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr',
            locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR',
          )}
        />
      )}
    </div>
  );
}
