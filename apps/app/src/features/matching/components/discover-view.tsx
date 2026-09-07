'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { MatchyHeaderActions } from '@/components/matchy/matchy-header-actions';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import {
  fetchFavoriteIds,
  selectFavorites,
  toggleFavorite,
} from '@/features/favorites/store/favorites-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  useAutoCaptureGrantedLocation,
  useLocationGate,
} from '@/features/location/location-context';
import {
  DiscoverEmptyFeed,
  DiscoverEmptyPicks,
} from '@/features/matching/components/discover-empty-feed';
import {
  AIPicksHeader,
  AIRecommendationItem,
  LiveScorePanel,
  MatchScoreBadge,
} from '@/features/matching/components/live-ai-score';
import { MatchCelebrationModal } from '@/features/matching/components/match-celebration-modal';
import { ProfileDetailModal } from '@/features/matching/components/profile-detail-modal';
import { SwipeLimitModal } from '@/features/matching/components/swipe-limit-modal';
import { formatRole } from '@/features/matching/lib/format-role';
import {
  clearCelebration,
  clearFeed,
  clearSwipeError,
  closeQuotaModal,
  fetchMatchState,
  fetchQuota,
  fetchSwipeFeed,
  selectMatching,
  selectTopFeedProfile,
  swipeProfile,
} from '@/features/matching/store/matching-slice';
import {
  fetchNotifications,
  selectNotifications,
} from '@/features/notifications/store/notifications-slice';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { useVideoSettings } from '@/lib/video-settings';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Bookmark,
  Check,
  Heart,
  Loader2,
  Lock,
  MapPin,
  Play,
  Star,
  ThumbsDown,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export function DiscoverView() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { settings: videoSettings } = useVideoSettings();
  const matching = useAppSelector(selectMatching);
  const { unreadCount } = useAppSelector(selectNotifications);
  const { favoriteIds, actionLoading: favLoading } = useAppSelector(selectFavorites);
  const top = useAppSelector(selectTopFeedProfile);
  const isTopFavorited = Boolean(top?.id && favoriteIds.includes(top.id));
  const topPhoto = useAuthenticatedMediaUrl(top?.image);
  const topVideo = useAuthenticatedMediaUrl(top?.video, { stream: true });
  const cardVideoRef = useRef<HTMLVideoElement>(null);
  const [userPausedId, setUserPausedId] = useState<string | null>(null);
  const [userPlayingId, setUserPlayingId] = useState<string | null>(null);
  const [isCardVideoMuted, setIsCardVideoMuted] = useState(true);
  const [isVideoBuffering, setIsVideoBuffering] = useState(false);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);

  const isCardVideoPlaying = Boolean(
    top?.id ? (videoSettings.autoPlay ? userPausedId !== top.id : userPlayingId === top.id) : false,
  );

  const handleToggleCardVideo = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!top?.id) return;
    const video = cardVideoRef.current;
    if (!video) return;

    if (isCardVideoPlaying) {
      setUserPausedId(top.id);
      setUserPlayingId(null);
      video.pause();
    } else {
      setUserPausedId(null);
      setUserPlayingId(top.id);
      void video.play().catch(() => {});
    }
  };
  const {
    latitude,
    longitude,
    locationRequired,
    activating,
    accessMessage,
    requestBrowserLocation,
    locationSynced,
  } = useLocationGate();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProfileId, setDetailProfileId] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);
  const [forceQuotaModal, setForceQuotaModal] = useState(false);
  const [quotaModalReason, setQuotaModalReason] = useState<'limit' | 'status' | 'locked_profile'>(
    'limit',
  );

  useEffect(() => {
    void dispatch(fetchNotifications());
    void dispatch(fetchQuota());
    void dispatch(fetchFavoriteIds());
  }, [dispatch]);

  useAutoCaptureGrantedLocation();

  useEffect(() => {
    if (!locationSynced || latitude == null || longitude == null) {
      dispatch(clearFeed());
      return;
    }
    // Re-fetch when location changes or when feedLoaded is reset (e.g. after withdraw/unmatch).
    if (!matching.feedLoaded) {
      void dispatch(fetchSwipeFeed({ latitude, longitude }));
    }
  }, [dispatch, locationSynced, latitude, longitude, matching.feedLoaded]);

  const quota = matching.quota;
  const freeRemaining = quota?.remaining;
  const freeLimit = quota?.limit;
  const isRightSwipeBlocked = Boolean(
    quota && !quota.unlimited && quota.remaining != null && quota.remaining <= 0,
  );

  const detailProfile =
    matching.feed.find((p) => p.id === detailProfileId) || (detailOpen && top ? top : null);

  const onPass = async () => {
    if (!top || matching.swipeLoading) return;
    setSwipeDirection('left');
    try {
      await dispatch(swipeProfile({ targetUserId: top.id, direction: 'left', profile: top }));
    } catch {
      // Errors stored on slice.
    } finally {
      setSwipeDirection(null);
    }
  };

  const onConnect = async () => {
    if (!top || matching.swipeLoading) return;
    if (isRightSwipeBlocked) {
      setQuotaModalReason('limit');
      setForceQuotaModal(true);
      return;
    }
    setSwipeDirection('right');
    try {
      const result = await dispatch(
        swipeProfile({ targetUserId: top.id, direction: 'right', profile: top }),
      );
      if (swipeProfile.fulfilled.match(result) && result.payload.match) {
        void dispatch(fetchMatchState());
      }
    } catch {
      // Errors stored on slice.
    } finally {
      setSwipeDirection(null);
    }
  };

  const onFavorite = async () => {
    if (!top || Boolean(top.id && favLoading[top.id])) return;
    try {
      const res = await dispatch(toggleFavorite(top.id)).unwrap();
      if (res.favorited) {
        toast.success(
          locale === 'en'
            ? `${top.name} added to favorites ⭐`
            : locale === 'ar'
              ? `تمت إضافة ${top.name} إلى المفضلة ⭐`
              : `${top.name} ajouté aux favoris ⭐`,
        );
      } else {
        toast.success(
          locale === 'en'
            ? `${top.name} removed from favorites`
            : locale === 'ar'
              ? `تمت إزالة ${top.name} من المفضلة`
              : `${top.name} retiré des favoris`,
        );
      }
    } catch {
      toast.error(t('common.errorOccurred') || 'Error');
    }
  };

  const showHomeFeedLoader = locationSynced && (matching.feedLoading || !matching.feedLoaded);

  const title = locale === 'fr' ? 'Accueil' : locale === 'ar' ? 'الرئيسية' : t('nav.home');

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      style={{ background: matchyBrand.bg }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Main swipe column */}
        <div
          className={
            top
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-2 pb-2 md:px-8'
              : 'flex min-h-0 flex-1 flex-col overflow-hidden'
          }
        >
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            {showHomeFeedLoader ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div
                  className="mx-auto mb-3 animate-spin"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    border: '3px solid #D9E6F5',
                    borderTopColor: '#2F76BB',
                  }}
                />
                <p className="mt-2 text-[#888]" style={{ fontSize: 14 }}>
                  {t('matching.loadingProfiles')}
                </p>
              </div>
            ) : locationRequired ? null : (
              <>
                {top && (
                  <div
                    className="absolute rounded-2xl"
                    style={{
                      width: 'min(88%, 420px)',
                      height: '88%',
                      bottom: 6,
                      background: '#DDE7F4',
                      transform: 'scale(0.95)',
                      zIndex: 0,
                      borderRadius: 20,
                    }}
                  />
                )}

                <AnimatePresence mode="wait">
                  {top && (
                    <motion.div
                      key={top.id}
                      className="absolute cursor-grab touch-none overflow-hidden rounded-2xl shadow-xl select-none active:cursor-grabbing"
                      style={{
                        width: 'min(92%, 440px)',
                        height: 'min(90%, 560px)',
                        zIndex: 1,
                      }}
                      drag={!matching.swipeLoading}
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      dragElastic={0.7}
                      onDragEnd={(_e, info) => {
                        const offsetX = info.offset.x;
                        const velocityX = info.velocity.x;
                        if (offsetX > 100 || velocityX > 500) {
                          void onConnect();
                        } else if (offsetX < -100 || velocityX < -500) {
                          void onPass();
                        }
                      }}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                        x: swipeDirection === 'left' ? -500 : swipeDirection === 'right' ? 500 : 0,
                        y: swipeDirection === 'up' ? -550 : 0,
                        rotate:
                          swipeDirection === 'left' ? -22 : swipeDirection === 'right' ? 22 : 0,
                      }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {topVideo.url ? (
                        <>
                          <video
                            key={topVideo.url}
                            ref={cardVideoRef}
                            src={topVideo.url}
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
                              if (top?.id) {
                                setUserPlayingId(top.id);
                                setUserPausedId(null);
                              }
                            }}
                            onPause={() => {
                              setIsVideoBuffering(false);
                              if (top?.id) {
                                setUserPausedId(top.id);
                                setUserPlayingId(null);
                              }
                            }}
                            onEnded={() => {
                              setIsVideoBuffering(false);
                              if (top?.id) {
                                setUserPausedId(top.id);
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

                          {/* Video Buffering / Loading Spinner */}
                          {isVideoBuffering && (
                            <div className="pointer-events-none absolute inset-0 z-25 flex items-center justify-center bg-black/30 backdrop-blur-xs">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 shadow-2xl backdrop-blur-md">
                                <Loader2 className="h-8 w-8 animate-spin text-[#61BCA6]" />
                              </div>
                            </div>
                          )}

                          {/* Sound control toggle button (Mute / Unmute) */}
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
                            className="pointer-events-auto absolute right-4 bottom-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80 active:scale-95"
                            style={{ border: '1px solid rgba(255,255,255,0.3)' }}
                          >
                            {isCardVideoMuted ? (
                              <VolumeX size={16} className="text-white" />
                            ) : (
                              <Volume2 size={16} className="text-white" />
                            )}
                          </button>

                          {/* Centered Play Button when paused / stopped */}
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
                      ) : topPhoto.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={topPhoto.url}
                          alt={top.name}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-7xl font-bold text-white">
                          {top.name.slice(0, 1)}
                        </div>
                      )}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.4) 100%)',
                          pointerEvents: 'none',
                        }}
                      />

                      {/* Top left rating pill */}
                      <div
                        className="absolute top-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-1 shadow-xs backdrop-blur-md"
                        style={{ background: 'rgba(255,255,255,0.92)' }}
                      >
                        <Star size={12} color="#F5A623" fill="#F5A623" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#353535' }}>
                          {Number.isFinite(top.rating) ? top.rating.toFixed(1) : '0.0'}
                        </span>
                      </div>

                      {/* Top right: Available pill, Bookmark button, & Voir details button */}
                      <div className="pointer-events-auto absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {/* Available pill */}
                          <div
                            className="flex h-8 items-center gap-1 rounded-full px-2.5 text-white shadow-xs backdrop-blur-md"
                            style={{
                              background: 'rgba(97,188,166,0.9)',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            <Check size={12} strokeWidth={3} />
                            <span>{t('matching.available')}</span>
                          </div>

                          {/* Bookmark / Favorite button on the right */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void onFavorite();
                            }}
                            disabled={Boolean(top.id && favLoading[top.id])}
                            aria-label={
                              isTopFavorited
                                ? t('profileDetail.removeFromFavorites')
                                : t('profileDetail.addToFavorites')
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                          >
                            <Bookmark
                              size={16}
                              color={isTopFavorited ? '#F5A623' : 'white'}
                              fill={isTopFavorited ? '#F5A623' : 'none'}
                            />
                          </button>
                        </div>

                        {/* See details button */}
                        <button
                          type="button"
                          onClick={() => {
                            setDetailProfileId(top.id);
                            setDetailOpen(true);
                          }}
                          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-white shadow-xs backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'rgba(47,118,187,0.85)',
                          }}
                        >
                          <span>👆</span>
                          <span>{t('matching.seeDetails')}</span>
                        </button>
                      </div>

                      {/* Top left AI match score badge (complementary tag removed per spec) */}
                      <div className="absolute top-12 left-3">
                        <MatchScoreBadge score={top.match_score} size="lg" />
                      </div>

                      {/* Bottom card info */}
                      <div className="absolute right-0 bottom-0 left-0 p-4">
                        <div className="mb-1 flex items-end justify-between">
                          <div>
                            <h2
                              className="flex items-center gap-1.5 text-white"
                              style={{ fontSize: 22, fontWeight: 700 }}
                            >
                              <span>{top.name}</span>
                              {top.verified && (
                                <BadgeCheck
                                  size={20}
                                  className="shrink-0 fill-[#3B82F6] text-[#3B82F6] text-white"
                                  aria-label="Verified user"
                                />
                              )}
                            </h2>
                            <p
                              className="text-white opacity-90"
                              style={{ fontSize: 14, fontWeight: 500 }}
                            >
                              {formatRole(top.service_type || top.job || top.category, t)}
                            </p>
                          </div>
                        </div>
                        {(top.distance_km != null || top.city) && (
                          <div className="mb-2 flex items-center gap-1">
                            <MapPin size={12} color="#61BCA6" />
                            <span className="text-white opacity-75" style={{ fontSize: 12 }}>
                              {top.distance_km != null
                                ? t('matching.kmAway', { km: top.distance_km })
                                : top.city}
                            </span>
                          </div>
                        )}
                        {top.bio && (
                          <p
                            className="mb-3 text-white opacity-85"
                            style={{ fontSize: 12, lineHeight: 1.4 }}
                          >
                            {top.bio}
                          </p>
                        )}
                        {top.interests?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {top.interests.slice(0, 5).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full px-2.5 py-0.5 text-white shadow-2xs"
                                style={{
                                  fontSize: 11,
                                  background: 'rgba(97,188,166,0.65)',
                                  border: '1px solid rgba(97,188,166,0.4)',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!top && !matching.feedLoading && (
                  <DiscoverEmptyFeed
                    errorKey={matching.feedError}
                    refreshing={matching.feedLoading}
                    onRefresh={() =>
                      void dispatch(
                        fetchSwipeFeed(
                          latitude != null && longitude != null
                            ? { latitude, longitude }
                            : undefined,
                        ),
                      )
                    }
                  />
                )}
              </>
            )}
          </div>

          {/* Action buttons — Matchy exact */}
          {top && !locationRequired && (
            <>
              {matching.swipeError && (
                <div className="mx-auto mb-2 flex w-full max-w-[340px] items-center justify-between rounded-xl bg-[#FFF0F0] px-3 py-2 text-xs text-[#E74C3C]">
                  <span>{t(matching.swipeError)}</span>
                  <button type="button" onClick={() => dispatch(clearSwipeError())}>
                    {t('common.close')}
                  </button>
                </div>
              )}

              {/* Action count pill banner (from Figma design) */}
              {quota && !quota.unlimited && (
                <div
                  onClick={() => {
                    setQuotaModalReason(freeRemaining === 0 ? 'limit' : 'status');
                    setForceQuotaModal(true);
                  }}
                  className="mx-auto mt-3 mb-2 flex cursor-pointer items-center justify-start gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: freeRemaining === 0 ? '#FFF1F2' : '#FFFBEB',
                    color: freeRemaining === 0 ? '#E11D48' : '#D97706',
                    border: freeRemaining === 0 ? '1px solid #FECDD3' : '1px solid #FDE68A',
                    maxWidth: 360,
                    width: '100%',
                  }}
                >
                  <AlertTriangle
                    size={13}
                    className={freeRemaining === 0 ? 'text-[#E11D48]' : 'text-[#D97706]'}
                  />
                  <span>
                    {t('matching.swipeQuotaActionsRemaining', {
                      remaining: freeRemaining ?? 0,
                      limit: quota.limit ?? 10,
                    })}
                  </span>
                </div>
              )}

              <div
                className="mx-auto mb-3 flex items-center justify-center gap-3"
                style={{ maxWidth: 360, width: '100%' }}
              >
                {/* Skip / Pass Button */}
                <button
                  type="button"
                  onClick={() => void onPass()}
                  disabled={!top || matching.swipeLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white py-3 font-bold text-[#475569] shadow-xs transition-all hover:bg-[#F8FAFC] active:scale-[0.98] disabled:opacity-60"
                  style={{
                    fontSize: 15,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <X size={18} className="text-[#64748B]" strokeWidth={2.5} />
                  <span>{t('matching.pass')}</span>
                </button>

                {/* Connect Button */}
                <button
                  type="button"
                  onClick={() => void onConnect()}
                  disabled={!top || matching.swipeLoading || isRightSwipeBlocked}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] py-3 font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
                  style={{
                    fontSize: 15,
                    cursor: isRightSwipeBlocked ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Check size={18} strokeWidth={2.5} className="text-white" />
                  <span>{t('matching.connect')}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right panel: Live AI Score + Top Picks — Matchy exact (lg+) */}
        <div
          className="hidden flex-col gap-4 overflow-y-auto px-4 py-4 lg:flex"
          style={{ width: 320, borderLeft: '1px solid #F0F0F0', background: matchyBrand.bg }}
        >
          {locationRequired || !locationSynced ? null : (
            <>
              {top ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-2xl" style={{ height: 130 }}>
                    {topVideo.url ? (
                      <video
                        key={`sidebar-${topVideo.url}`}
                        src={topVideo.url}
                        preload="auto"
                        autoPlay={videoSettings.autoPlay}
                        playsInline
                        loop
                        muted
                        onLoadedData={(e) => {
                          if (videoSettings.autoPlay) {
                            void e.currentTarget.play().catch(() => {});
                          }
                        }}
                        className="h-full w-full bg-black object-cover"
                      />
                    ) : topPhoto.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={topPhoto.url}
                        alt={top.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-3xl font-bold text-white">
                        {top.name.slice(0, 1)}
                      </div>
                    )}
                    {/* Gradient overlay only if not showing video (removed for video per item 9) */}
                    {!topVideo.url && (
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
                        }}
                      />
                    )}
                    <div className="absolute bottom-2 left-3">
                      <p style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>{top.name}</p>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>
                        {formatRole(top.service_type || top.job || top.category, t)}
                      </p>
                    </div>
                    <div className="absolute right-2 bottom-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailProfileId(top.id);
                          setDetailOpen(true);
                        }}
                        className="rounded-lg px-2 py-1"
                        style={{
                          background: 'rgba(255,255,255,0.15)',
                          backdropFilter: 'blur(8px)',
                          color: 'white',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {t('matching.seeDetails')}
                      </button>
                    </div>
                  </div>
                  <LiveScorePanel
                    profile={top}
                    isComputing={matching.feedLoading && !matching.feedLoaded}
                  />
                </div>
              ) : null}

              <div
                className="flex items-center gap-2"
                style={{ borderTop: '1px solid #F0F0F0', paddingTop: 12 }}
              >
                <AIPicksHeader
                  count={Math.min(
                    5,
                    matching.feed.filter(
                      (p) => p.id !== top?.id && !dismissedSuggestionIds.includes(p.id),
                    ).length,
                  )}
                />
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {matching.feedLoading && !matching.feedLoaded ? (
                  <div className="space-y-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-14 animate-pulse rounded-xl"
                        style={{ background: '#F5F5F5', animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                ) : matching.feed.filter(
                    (p) => p.id !== top?.id && !dismissedSuggestionIds.includes(p.id),
                  ).length === 0 ? (
                  <DiscoverEmptyPicks />
                ) : (
                  matching.feed
                    .filter((p) => p.id !== top?.id && !dismissedSuggestionIds.includes(p.id))
                    .slice(0, 5)
                    .map((profile, i) => (
                      <AIRecommendationItem
                        key={profile.id}
                        profile={profile}
                        rank={i}
                        onDismiss={() => {
                          setDismissedSuggestionIds((prev) => [...prev, profile.id]);
                        }}
                        onClick={() => {
                          const isLocked = Boolean(profile.is_locked || i >= 3);
                          if (isLocked) {
                            setQuotaModalReason('locked_profile');
                            setForceQuotaModal(true);
                            return;
                          }
                          setDetailProfileId(profile.id);
                          setDetailOpen(true);
                        }}
                      />
                    ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {detailOpen && detailProfile && (
        <ProfileDetailModal
          profile={detailProfile}
          busy={matching.swipeLoading}
          onClose={() => {
            setDetailOpen(false);
            setDetailProfileId(null);
          }}
          onPass={() => {
            setDetailOpen(false);
            setDetailProfileId(null);
            if (detailProfile.id === top?.id) void onPass();
          }}
          onConnect={() => {
            setDetailOpen(false);
            setDetailProfileId(null);
            if (detailProfile.id === top?.id) void onConnect();
          }}
        />
      )}

      {(matching.showQuotaModal || forceQuotaModal) && (
        <SwipeLimitModal
          reason={forceQuotaModal ? quotaModalReason : 'limit'}
          onClose={() => {
            setForceQuotaModal(false);
            setQuotaModalReason('limit');
            dispatch(closeQuotaModal());
          }}
        />
      )}

      {matching.celebrationProfile && (
        <MatchCelebrationModal
          profile={matching.celebrationProfile}
          onContinue={() => dispatch(clearCelebration())}
          onViewMatches={() => {
            dispatch(clearCelebration());
            router.push('/matches');
          }}
        />
      )}
    </div>
  );
}
