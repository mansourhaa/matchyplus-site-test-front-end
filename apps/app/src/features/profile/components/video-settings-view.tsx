'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { VideoJSPlayer } from '@/components/video-js-player';
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
import { VideoQuality, useVideoSettings } from '@/lib/video-settings';
import {
  AlertCircle,
  Check,
  Film,
  Info,
  Monitor,
  Play,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Wifi,
  Zap,
} from 'lucide-react';
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

  // Persistent Video Settings
  const { settings: videoSettings, updateSettings } = useVideoSettings();
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

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
      setAspectRatio(null);
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

  const handleLoadedMetadata = () => {
    setPlaybackError(false);
    const video = videoRef.current;
    if (video && video.videoWidth && video.videoHeight) {
      const ratio = video.videoWidth / video.videoHeight;
      setAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
    }
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
    <div className="mx-auto w-full max-w-xl space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 1. Intro Video Card */}
      <section
        className="rounded-3xl bg-white p-5 shadow-xs"
        style={{ border: '1px solid #F0F0F0' }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0FA]">
            <Film size={20} color={matchyBrand.blue} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#1A1A2E]">
              {locale === 'en'
                ? 'Intro video'
                : locale === 'ar'
                  ? 'فيديو المقدمة'
                  : "Vidéo d'intro"}
            </h2>
            <p className="text-xs text-[#888]">
              {locale === 'en'
                ? 'Max duration: 20 seconds'
                : locale === 'ar'
                  ? 'المدة الأقصى: 20 ثانية'
                  : 'Durée max : 20 secondes'}
            </p>
          </div>
        </div>

        {hasVideo ? (
          <div>
            <div className="relative mb-4 flex w-full items-center justify-center overflow-hidden rounded-2xl bg-black">
              {previewUrl ? (
                <VideoJSPlayer
                  src={previewUrl}
                  controls
                  playsinline
                  fluid
                  aspectRatio="16:9"
                  className="w-full"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center py-20 text-xs text-white/70"
                  style={{ minHeight: '200px' }}
                >
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

              {/* Added badge on top right */}
              <span
                className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-sm`}
                style={{ background: '#61BCA6' }}
              >
                <Sparkles size={11} />{' '}
                {locale === 'en' ? 'Added ✓' : locale === 'ar' ? 'تمت الإضافة ✓' : 'Ajoutée ✓'}
              </span>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowRecorder(true)}
                disabled={mediaUploading}
                className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-bold text-[#2F76BB] transition-colors hover:bg-[#DDEBFA] disabled:opacity-60"
                style={{ background: '#EBF4FC' }}
              >
                <Upload size={16} />
                {mediaUploading
                  ? locale === 'en'
                    ? 'Uploading...'
                    : locale === 'ar'
                      ? 'جارٍ الرفع...'
                      : 'Envoi en cours…'
                  : locale === 'en'
                    ? 'Change video'
                    : locale === 'ar'
                      ? 'تغيير الفيديو'
                      : 'Remplacer la vidéo'}
              </button>

              <button
                type="button"
                onClick={handleRemove}
                disabled={mediaUploading}
                className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-bold text-[#FF6B6B] transition-colors hover:bg-[#FFE5E5] disabled:opacity-60"
                style={{ background: '#FFF0F0' }}
                aria-label={
                  locale === 'en'
                    ? 'Delete video'
                    : locale === 'ar'
                      ? 'حذف الفيديو'
                      : 'Supprimer la vidéo'
                }
              >
                <Trash2 size={16} />{' '}
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

      {/* 2. Video Quality Card */}
      <section
        className="rounded-3xl bg-white p-5 shadow-xs"
        style={{ border: '1px solid #F0F0F0' }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F8F5]">
            <Monitor size={20} color="#61BCA6" />
          </div>
          <h2 className="text-base font-extrabold text-[#1A1A2E]">
            {locale === 'en' ? 'Video quality' : locale === 'ar' ? 'جودة الفيديو' : 'Qualité vidéo'}
          </h2>
        </div>

        <div className="space-y-2.5">
          {/* Option 1: HD */}
          <div
            onClick={() => updateSettings({ quality: 'hd' })}
            className={`flex cursor-pointer items-center justify-between rounded-2xl p-4 transition-all ${
              videoSettings.quality === 'hd'
                ? 'border-2 border-[#2F76BB] bg-[#F4F9FD]'
                : 'border border-[#E5E7EB] bg-white hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[#1A1A2E]">
                  {locale === 'en'
                    ? 'High quality (HD)'
                    : locale === 'ar'
                      ? 'جودة عالية (HD)'
                      : 'Haute qualité (HD)'}
                </span>
                <span className="rounded bg-[#2F76BB] px-1.5 py-0.5 text-[10px] font-black text-white">
                  HD
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#888]">
                {locale === 'en'
                  ? '1080p HD - More data'
                  : locale === 'ar'
                    ? '1080p HD - بيانات أكثر'
                    : '1080p HD - Plus de données'}
              </p>
            </div>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                videoSettings.quality === 'hd'
                  ? 'border-[#2F76BB] bg-[#2F76BB]'
                  : 'border-[#CBD5E1] bg-white'
              }`}
            >
              {videoSettings.quality === 'hd' && <Check size={12} color="white" strokeWidth={3} />}
            </div>
          </div>

          {/* Option 2: Standard */}
          <div
            onClick={() => updateSettings({ quality: 'standard' })}
            className={`flex cursor-pointer items-center justify-between rounded-2xl p-4 transition-all ${
              videoSettings.quality === 'standard'
                ? 'border-2 border-[#2F76BB] bg-[#F4F9FD]'
                : 'border border-[#E5E7EB] bg-white hover:bg-slate-50'
            }`}
          >
            <div>
              <span className="text-[14px] font-bold text-[#1A1A2E]">
                {locale === 'en'
                  ? 'Standard quality'
                  : locale === 'ar'
                    ? 'جودة قياسية'
                    : 'Qualité standard'}
              </span>
              <p className="mt-0.5 text-xs text-[#888]">
                {locale === 'en'
                  ? '720p - Balanced'
                  : locale === 'ar'
                    ? '720p - متوازن'
                    : '720p - Équilibré'}
              </p>
            </div>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                videoSettings.quality === 'standard'
                  ? 'border-[#2F76BB] bg-[#2F76BB]'
                  : 'border-[#CBD5E1] bg-white'
              }`}
            >
              {videoSettings.quality === 'standard' && (
                <Check size={12} color="white" strokeWidth={3} />
              )}
            </div>
          </div>

          {/* Option 3: Data saving */}
          <div
            onClick={() => updateSettings({ quality: 'saving' })}
            className={`flex cursor-pointer items-center justify-between rounded-2xl p-4 transition-all ${
              videoSettings.quality === 'saving'
                ? 'border-2 border-[#2F76BB] bg-[#F4F9FD]'
                : 'border border-[#E5E7EB] bg-white hover:bg-slate-50'
            }`}
          >
            <div>
              <span className="text-[14px] font-bold text-[#1A1A2E]">
                {locale === 'en'
                  ? 'Data saving'
                  : locale === 'ar'
                    ? 'توفير البيانات'
                    : 'Économie de données'}
              </span>
              <p className="mt-0.5 text-xs text-[#888]">
                {locale === 'en'
                  ? '480p - Less data'
                  : locale === 'ar'
                    ? '480p - بيانات أقل'
                    : '480p - Moins de données'}
              </p>
            </div>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                videoSettings.quality === 'saving'
                  ? 'border-[#2F76BB] bg-[#2F76BB]'
                  : 'border-[#CBD5E1] bg-white'
              }`}
            >
              {videoSettings.quality === 'saving' && (
                <Check size={12} color="white" strokeWidth={3} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Playback Preferences Card */}
      <section
        className="rounded-3xl bg-white p-5 shadow-xs"
        style={{ border: '1px solid #F0F0F0' }}
      >
        <div className="space-y-4">
          {/* Row 1: Auto-play */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0FA]">
                <Play size={18} color="#2F76BB" />
              </div>
              <div>
                <span className="text-[14px] font-bold text-[#1A1A2E]">
                  {locale === 'en'
                    ? 'Auto-play'
                    : locale === 'ar'
                      ? 'تشغيل تلقائي'
                      : 'Lecture automatique'}
                </span>
                <p className="text-xs text-[#888]">
                  {locale === 'en'
                    ? 'Auto-play videos in the feed'
                    : locale === 'ar'
                      ? 'تشغيل الفيديو تلقائياً في الخلاصة'
                      : 'Lire les vidéos automatiquement dans le fil'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={videoSettings.autoPlay}
              onClick={() => updateSettings({ autoPlay: !videoSettings.autoPlay })}
              className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none"
              style={{ background: videoSettings.autoPlay ? '#2F76BB' : '#CBD5E1' }}
              dir="ltr"
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out"
                style={{
                  transform: videoSettings.autoPlay ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          <div className="h-[1px] w-full bg-[#F3F4F6]" />

          {/* Row 2: WiFi only */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F8F5]">
                <Wifi size={18} color="#61BCA6" />
              </div>
              <div>
                <span className="text-[14px] font-bold text-[#1A1A2E]">
                  {locale === 'en'
                    ? 'WiFi only'
                    : locale === 'ar'
                      ? 'عبر WiFi فقط'
                      : 'WiFi uniquement'}
                </span>
                <p className="text-xs text-[#888]">
                  {locale === 'en'
                    ? 'Download videos on WiFi only'
                    : locale === 'ar'
                      ? 'تنزيل الفيديوهات عبر شبكة WiFi فقط'
                      : 'Télécharger les vidéos en WiFi uniquement'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={videoSettings.wifiOnly}
              onClick={() => updateSettings({ wifiOnly: !videoSettings.wifiOnly })}
              className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none"
              style={{ background: videoSettings.wifiOnly ? '#2F76BB' : '#CBD5E1' }}
              dir="ltr"
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out"
                style={{
                  transform: videoSettings.wifiOnly ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 4. AI Boost Callout Banner */}
      <aside
        className="flex items-start gap-3 rounded-2xl p-4 shadow-2xs"
        style={{ background: '#EBF5FB', border: '1px solid #D0E3F8' }}
      >
        <Info size={18} color="#2F76BB" className="mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed text-[#2F76BB]">
          {locale === 'en'
            ? 'A presentation video increases your match chances by up to 3×. It will be analyzed by AI to automatically enrich your profile.'
            : locale === 'ar'
              ? 'فيديو العرض التقديمي يزيد فرص المطابقة لديك حتى 3 أضعاف. سيتم تحليله بواسطة الذكاء الاصطناعي لإثراء ملفك الشخصي تلقائياً.'
              : 'Une vidéo de présentation augmente vos chances de match jusqu’à 3x. Elle sera analysée par IA pour remplir votre profil automatiquement.'}
        </p>
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
