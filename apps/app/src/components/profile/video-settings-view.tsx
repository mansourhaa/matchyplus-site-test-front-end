'use client';

import { matchyBrand } from '@/components/matchy/brand';
import {
  VideoRecorderModal,
  buildVideoRecorderTr,
} from '@/components/onboarding/video-recorder-modal';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
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

  const showToast = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
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
    void video
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  };

  if (!profile && loading) {
    return <div className="py-16 text-center text-sm text-[#888]">Chargement de la vidéo…</div>;
  }
  if (!profile && profileError) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm" role="alert">
        <p className="text-sm text-[#E24E59]">Impossible de charger votre profil.</p>
        <button
          type="button"
          onClick={() => dispatch(fetchOnboardingProfile())}
          className="mt-4 rounded-xl bg-[#2F76BB] px-5 py-2.5 text-sm font-bold text-white"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F0FA]">
            <Film size={18} color={matchyBrand.blue} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#353535]">Vidéo de présentation</h2>
            <p className="text-[11px] text-[#888]">Durée max : 20 secondes</p>
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
                  {authenticated.loading ? 'Chargement de la vidéo…' : 'Vidéo inaccessible'}
                </div>
              )}
              {!playing && previewUrl && (
                <button
                  type="button"
                  onClick={startPreview}
                  className="absolute inset-0 flex items-center justify-center bg-black/30"
                  aria-label="Lire la vidéo"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90">
                    <Play size={22} color={matchyBrand.blue} fill={matchyBrand.blue} />
                  </span>
                </button>
              )}
              <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-[#61BCA6] px-2 py-1 text-[10px] font-bold text-white">
                <Zap size={10} /> Ajoutée ✓
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
                {mediaUploading ? 'Envoi en cours…' : 'Remplacer la vidéo'}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={mediaUploading}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#FFF0F0] py-2.5 text-[13px] font-bold text-[#FF6B6B] disabled:opacity-60"
                aria-label="Supprimer la vidéo"
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowRecorder(true)}
            disabled={mediaUploading}
            className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#D0E4F7] py-8 text-[#888] hover:bg-[#F5F7FA] disabled:opacity-60"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0FA]">
              <Video size={24} color={matchyBrand.blue} />
            </span>
            <span className="text-center">
              <span className="block text-sm font-bold text-[#2F76BB]">
                Enregistrer ou importer
              </span>
              <span className="mt-0.5 block text-xs text-[#AAA]">
                {mediaUploading ? 'Envoi en cours…' : 'Caméra ou import · 20s max'}
              </span>
            </span>
          </button>
        )}

        {(clientError || mediaError || authenticated.error || playbackError) && (
          <p className="mt-2 text-xs text-[#E74C3C]" role="alert">
            {clientError ||
              (authenticated.error || playbackError
                ? 'Cette vidéo est inaccessible.'
                : humanizeMediaError(mediaError)) ||
              'Échec de la vidéo.'}
          </p>
        )}
      </section>

      <aside className="rounded-2xl border border-[#D0E4F7] bg-[#EEF5FF] p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} color={matchyBrand.blue} className="mt-0.5 shrink-0" />
          <p className="text-xs leading-5 text-[#2F76BB]">
            Une vidéo de présentation augmente vos chances de match jusqu&apos;à 3×.
          </p>
        </div>
      </aside>

      {saved && (
        <div
          className="fixed right-4 bottom-6 left-4 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-white shadow-lg md:right-8 md:left-auto md:w-80"
          style={{ background: matchyBrand.gradient }}
          role="status"
        >
          <Zap size={18} />
          <span className="text-[13px] font-bold">✓ Vidéo enregistrée avec succès !</span>
        </div>
      )}

      {showRecorder && (
        <VideoRecorderModal
          onVideoReady={handleVideoReady}
          onClose={() => setShowRecorder(false)}
          tr={buildVideoRecorderTr('fr', 'fr-FR')}
        />
      )}
    </div>
  );
}
