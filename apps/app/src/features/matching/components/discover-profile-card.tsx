'use client';

import { VerifiedShield } from '@/components/matchy/verified-shield';
import { useI18n } from '@/features/i18n/i18n-provider';
import { matchLevelLabel } from '@/features/matching/components/live-ai-score';
import { formatRole } from '@/features/matching/lib/format-role';
import type { FeedProfile } from '@/features/matching/types';
import { useVideoSettings } from '@/lib/video-settings';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  BrainCircuit,
  Loader2,
  MapPin,
  Play,
  Star,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useRef, useState } from 'react';

/**
 * Home profile card (2.0.8): photo or video, rating / AI score / level / video badges,
 * available + favourite + details + sound, then name, role, price, distance, bio and tags.
 * Drag left / right to pass / connect. Owns the card video state (play, pause, sound).
 */
export function DiscoverProfileCard({
  profile,
  photoUrl,
  videoUrl,
  swipeDirection,
  swipeLoading,
  isFavorited,
  favoriteBusy,
  onFavorite,
  onOpenDetails,
  onConnect,
  onPass,
}: {
  profile: FeedProfile;
  photoUrl: string | null | undefined;
  videoUrl: string | null | undefined;
  swipeDirection: 'left' | 'right' | 'up' | null;
  swipeLoading: boolean;
  isFavorited: boolean;
  favoriteBusy: boolean;
  onFavorite: () => void;
  onOpenDetails: () => void;
  onConnect: () => void;
  onPass: () => void;
}) {
  const { t, locale } = useI18n();
  const { settings: videoSettings } = useVideoSettings();
  const cardVideoRef = useRef<HTMLVideoElement>(null);
  const [userPausedId, setUserPausedId] = useState<string | null>(null);
  const [userPlayingId, setUserPlayingId] = useState<string | null>(null);
  const [isCardVideoMuted, setIsCardVideoMuted] = useState(true);
  const [isVideoBuffering, setIsVideoBuffering] = useState(false);

  const isCardVideoPlaying = videoSettings.autoPlay
    ? userPausedId !== profile.id
    : userPlayingId === profile.id;

  const handleToggleCardVideo = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = cardVideoRef.current;
    if (!video) return;

    if (isCardVideoPlaying) {
      setUserPausedId(profile.id);
      setUserPlayingId(null);
      video.pause();
    } else {
      setUserPausedId(null);
      setUserPlayingId(profile.id);
      void video.play().catch(() => {});
    }
  };

  const priceLabel = (price: string) =>
    /(day|jour|j|يوم)/i.test(price)
      ? price
      : `${price.replace(/\/(h|hour|hr|heure|ساعة|س)/i, '').trim()} ${t('profileDetail.priceUnit')}`;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={profile.id}
        className="absolute inset-0 cursor-grab touch-none overflow-hidden rounded-[22px] text-white shadow-xl select-none active:cursor-grabbing"
        style={{ zIndex: 1 }}
        drag={!swipeLoading}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.7}
        onDragEnd={(_e, info) => {
          const offsetX = info.offset.x;
          const velocityX = info.velocity.x;
          if (offsetX > 100 || velocityX > 500) {
            onConnect();
          } else if (offsetX < -100 || velocityX < -500) {
            onPass();
          }
        }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          x: swipeDirection === 'left' ? -500 : swipeDirection === 'right' ? 500 : 0,
          y: swipeDirection === 'up' ? -550 : 0,
          rotate: swipeDirection === 'left' ? -22 : swipeDirection === 'right' ? 22 : 0,
        }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {videoUrl ? (
          <>
            <video
              key={videoUrl}
              ref={cardVideoRef}
              src={videoUrl}
              preload="auto"
              autoPlay={isCardVideoPlaying}
              playsInline
              loop
              muted={isCardVideoMuted}
              onClick={handleToggleCardVideo}
              onWaiting={() => setIsVideoBuffering(true)}
              onPlaying={() => setIsVideoBuffering(false)}
              onPlay={() => {
                setIsVideoBuffering(false);
                if (profile.id) {
                  setUserPlayingId(profile.id);
                  setUserPausedId(null);
                }
              }}
              onPause={() => {
                setIsVideoBuffering(false);
                if (profile.id) {
                  setUserPausedId(profile.id);
                  setUserPlayingId(null);
                }
              }}
              onEnded={() => {
                setIsVideoBuffering(false);
                if (profile.id) {
                  setUserPausedId(profile.id);
                  setUserPlayingId(null);
                }
              }}
              onLoadedData={(e) => {
                setIsVideoBuffering(false);
                if (isCardVideoPlaying) {
                  void e.currentTarget.play().catch(() => {});
                }
              }}
              className="absolute inset-0 h-full w-full cursor-pointer bg-black object-cover"
            />

            {isVideoBuffering && (
              <div className="pointer-events-none absolute inset-0 z-25 flex items-center justify-center bg-black/30 backdrop-blur-xs">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 shadow-2xl backdrop-blur-md">
                  <Loader2 className="h-8 w-8 animate-spin text-[#61BCA6]" />
                </div>
              </div>
            )}

            {!isCardVideoPlaying && !isVideoBuffering && (
              <button
                type="button"
                onClick={handleToggleCardVideo}
                aria-label={
                  locale === 'en'
                    ? 'Play video'
                    : locale === 'ar'
                      ? 'تشغيل الفيديو'
                      : 'Lire la vidéo'
                }
                className="pointer-events-auto absolute inset-0 z-20 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                style={{ border: '2px solid rgba(255,255,255,0.4)' }}
              >
                <Play size={28} fill="white" className="ml-1 text-white" />
              </button>
            )}
          </>
        ) : photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={profile.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-7xl font-bold text-white">
            {profile.name.slice(0, 1)}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Top start: rating, AI score, level, video */}
        <div className="pointer-events-none absolute start-4 top-4 z-20 flex flex-col items-start gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-bold text-[#1A1A2E] shadow">
            <Star size={16} color="#F5A623" fill="#F5A623" />
            {profile.reviews || (Number.isFinite(profile.rating) && profile.rating > 0) ? (
              <>
                {profile.rating.toFixed(1)}
                {profile.reviews ? (
                  <span className="text-xs font-normal text-gray-400">({profile.reviews})</span>
                ) : null}
              </>
            ) : (
              t('matching.home.newProfile')
            )}
          </span>
          <span
            data-testid="discover-card-ai-score"
            className="flex items-center gap-1.5 rounded-xl bg-black/45 px-3 py-1.5 text-[17px] font-extrabold backdrop-blur"
          >
            <BrainCircuit size={16} />
            {Math.round(profile.match_score)}%
            <span className="text-xs">{t('matching.home.ai')}</span>
          </span>
          <span className="rounded-full bg-black/45 px-3 py-0.5 text-xs font-semibold">
            {matchLevelLabel(profile, locale)}
          </span>
          {profile.video && (
            <span className="flex items-center gap-1 rounded-full bg-black/45 px-3 py-0.5 text-xs font-semibold">
              <Video size={14} />
              {t('matching.home.video')}
            </span>
          )}
        </div>

        {/* Top end: available, favourite, details, sound */}
        <div className="pointer-events-auto absolute end-4 top-4 z-20 flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold">
              ✓ {t('matching.available')}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFavorite();
              }}
              disabled={favoriteBusy}
              aria-label={
                isFavorited
                  ? t('profileDetail.removeFromFavorites')
                  : t('profileDetail.addToFavorites')
              }
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
            >
              <Bookmark
                size={16}
                color={isFavorited ? '#F5A623' : 'white'}
                fill={isFavorited ? '#F5A623' : 'none'}
              />
            </button>
          </div>
          <button
            type="button"
            onClick={onOpenDetails}
            className="rounded-full bg-[#2F76BB] px-3 py-1 text-xs font-bold"
          >
            👆 {t('matching.seeDetails')}
          </button>
          {videoUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCardVideoMuted((prev) => !prev);
              }}
              aria-label={
                isCardVideoMuted
                  ? t('matching.unmuteVideo') || 'Unmute video'
                  : t('matching.muteVideo') || 'Mute video'
              }
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-all hover:bg-black/70 active:scale-95"
            >
              {isCardVideoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          )}
        </div>

        {/* Bottom: name, role, price, distance, bio, tags */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 text-[26px] font-extrabold">
                <span className="truncate">{profile.name}</span>
                {profile.verified && (
                  <VerifiedShield
                    size={22}
                    color="#48bba0"
                    className="shrink-0 drop-shadow-sm"
                    aria-label="Verified user"
                  />
                )}
              </h2>
              <p className="text-lg font-semibold opacity-95">
                {formatRole(profile.service_type || profile.job || profile.category, t)}
              </p>
            </div>
            {profile.price && (
              <span className="shrink-0 rounded-2xl bg-[#2F76BB] px-3 py-2 font-extrabold">
                {priceLabel(profile.price)}
              </span>
            )}
          </div>
          {((profile.distance_km != null && Number.isFinite(profile.distance_km)) ||
            profile.city) && (
            <p className="mt-1 flex items-center gap-1.5 text-sm opacity-90">
              <MapPin size={16} className="text-[#61BCA6]" />
              {profile.distance_km != null && Number.isFinite(profile.distance_km)
                ? t('matching.kmAway', { km: profile.distance_km })
                : profile.city}
            </p>
          )}
          {profile.bio && (
            <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed opacity-95">
              {profile.bio}
            </p>
          )}
          {profile.interests?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.interests.slice(0, 5).map((tag) => (
                <span key={tag} className="rounded-full bg-[#3F9B86]/90 px-3 py-1 text-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
