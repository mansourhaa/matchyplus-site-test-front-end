'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { MatchyHeaderActions } from '@/components/matchy/matchy-header-actions';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
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
  AIRightSidebarLocationEmpty,
  AIRightSidebarNoProfileEmpty,
  LiveScorePanel,
  MatchScoreBadge,
} from '@/features/matching/components/live-ai-score';
import { LocationRequiredOverlay } from '@/features/matching/components/location-required-overlay';
import { MatchCelebrationModal } from '@/features/matching/components/match-celebration-modal';
import { ProfileDetailModal } from '@/features/matching/components/profile-detail-modal';
import { SwipeLimitModal } from '@/features/matching/components/swipe-limit-modal';
import {
  clearCelebration,
  clearFeed,
  clearSwipeError,
  closeQuotaModal,
  fetchMatchState,
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
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, Check, Eye, Lock, MapPin, RefreshCw, Star, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const flags: Record<string, string> = { fr: '🇫🇷', en: '🇬🇧', ar: '🇹🇳' };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ background: '#F5F7FA', border: '1px solid #E0E0E0' }}
      >
        <span style={{ fontSize: 14 }}>{flags[locale]}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-9 right-0 z-50 overflow-hidden rounded-xl shadow-lg"
            style={{ background: 'white', border: '1px solid #F0F0F0', minWidth: 100 }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {(['fr', 'en', 'ar'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLocale(l);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-center px-3 py-2 hover:bg-[#F5F7FA]"
                style={{
                  fontSize: 13,
                  fontWeight: locale === l ? 700 : 400,
                  color: locale === l ? '#2F76BB' : '#555',
                  background: locale === l ? '#EEF5FF' : 'white',
                }}
              >
                <span style={{ fontSize: 16 }}>{flags[l]}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DiscoverView() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const matching = useAppSelector(selectMatching);
  const { unreadCount } = useAppSelector(selectNotifications);
  const top = useAppSelector(selectTopFeedProfile);
  const topPhoto = useAuthenticatedMediaUrl(top?.image);
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
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [forceQuotaModal, setForceQuotaModal] = useState(false);

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  useAutoCaptureGrantedLocation();

  useEffect(() => {
    if (!locationSynced || latitude == null || longitude == null) {
      dispatch(clearFeed());
      return;
    }
    void dispatch(fetchSwipeFeed({ latitude, longitude }));
  }, [dispatch, locationSynced, latitude, longitude]);

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

  const showHomeFeedLoader = locationSynced && (matching.feedLoading || !matching.feedLoaded);

  const title = locale === 'fr' ? 'Accueil' : locale === 'ar' ? 'الرئيسية' : t('nav.home');

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      style={{ background: matchyBrand.bg }}
    >
      {/* Header — Matchy exact */}
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3 md:px-6"
        style={{ background: 'white', borderBottom: '1px solid #F0F0F0' }}
      >
        <p className="hidden md:block" style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E' }}>
          {title}
        </p>
        <div className="flex md:hidden">
          <span style={{ fontSize: 18, fontWeight: 800, color: '#2F76BB' }}>
            Matchy<span style={{ color: '#61BCA6' }}>+</span>
          </span>
        </div>
        <MatchyHeaderActions />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Main swipe column — full-bleed white when empty so no gray frame around the empty state */}
        <div
          className={
            top
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4 pb-2 md:px-8'
              : 'flex min-h-0 flex-1 flex-col overflow-hidden'
          }
          style={!top ? { background: 'white' } : undefined}
        >
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            {locationRequired && (
              <LocationRequiredOverlay
                message={accessMessage}
                onActivate={() => void requestBrowserLocation()}
                busy={activating}
              />
            )}

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
                      className="absolute overflow-hidden rounded-2xl shadow-xl"
                      style={{ width: 'min(92%, 440px)', height: 'min(90%, 560px)', zIndex: 1 }}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                        x: swipeDirection === 'left' ? -420 : swipeDirection === 'right' ? 420 : 0,
                        rotate:
                          swipeDirection === 'left' ? -18 : swipeDirection === 'right' ? 18 : 0,
                      }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {topPhoto.url ? (
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
                            'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)',
                          pointerEvents: 'none',
                        }}
                      />

                      <div
                        className="absolute top-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-1"
                        style={{ background: 'rgba(255,255,255,0.92)' }}
                      >
                        <Star size={12} color="#F5A623" fill="#F5A623" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#353535' }}>
                          {Number.isFinite(top.rating) ? top.rating.toFixed(1) : '0.0'}
                        </span>
                      </div>

                      <div className="absolute top-14 left-3">
                        <MatchScoreBadge score={top.match_score} size="lg" />
                      </div>

                      <div className="pointer-events-auto absolute top-3 right-3 z-20 flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailProfileId(top.id);
                            setDetailOpen(true);
                          }}
                          className="rounded-full px-2 py-0.5 text-white"
                          style={{ fontSize: 10, background: 'rgba(47,118,187,0.7)' }}
                        >
                          {t('matching.seeDetails')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDetailProfileId(top.id);
                            setDetailOpen(true);
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-full"
                          style={{
                            background: 'rgba(0,0,0,0.45)',
                            border: '1px solid rgba(255,255,255,0.35)',
                          }}
                          aria-label={t('matching.seeDetails')}
                        >
                          <Eye size={17} color="white" />
                        </button>
                      </div>

                      <div className="absolute right-0 bottom-0 left-0 p-4">
                        <div className="mb-1 flex items-end justify-between">
                          <div>
                            <h2
                              className="flex items-center gap-1.5 text-white"
                              style={{ fontSize: 22, fontWeight: 700 }}
                            >
                              {top.name}
                            </h2>
                            <p
                              className="text-white opacity-90"
                              style={{ fontSize: 14, fontWeight: 500 }}
                            >
                              {top.service_type || top.job || top.category}
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
                            className="mb-3 text-white opacity-75"
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
                                className="rounded-full px-2 py-0.5 text-white"
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
              {quota && !quota.unlimited && freeRemaining != null && freeLimit != null && (
                <div
                  className="mx-auto mb-2 flex items-center justify-between rounded-xl px-3 py-2"
                  style={{
                    background: freeRemaining === 0 ? '#FFF0F0' : '#FFF8EB',
                    border: `1px solid ${freeRemaining === 0 ? '#FFCCCC' : '#F5A623'}`,
                    maxWidth: 340,
                    width: '100%',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} color={freeRemaining === 0 ? '#E74C3C' : '#F5A623'} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: freeRemaining === 0 ? '#E74C3C' : '#888',
                      }}
                    >
                      {t('matching.quotaLeft', { remaining: freeRemaining })}
                    </span>
                  </div>
                </div>
              )}

              {matching.swipeError && (
                <div className="mx-auto mb-2 flex w-full max-w-[340px] items-center justify-between rounded-xl bg-[#FFF0F0] px-3 py-2 text-xs text-[#E74C3C]">
                  <span>{t(matching.swipeError)}</span>
                  <button type="button" onClick={() => dispatch(clearSwipeError())}>
                    {t('common.close')}
                  </button>
                </div>
              )}

              <div
                className="mx-auto mt-1 mb-3 flex items-center justify-center gap-4"
                style={{ maxWidth: 360, width: '100%' }}
              >
                <button
                  type="button"
                  onClick={() => void onPass()}
                  disabled={!top || matching.swipeLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3.5 transition-transform active:scale-95"
                  style={{
                    background: 'white',
                    border: '2px solid #E0E0E0',
                    color: '#888',
                    fontSize: 15,
                    fontWeight: 700,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    opacity: top ? 1 : 0.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <X size={20} color="#888" />
                  {t('matching.pass')}
                </button>
                <button
                  type="button"
                  onClick={() => void onConnect()}
                  disabled={!top || matching.swipeLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3.5 transition-transform active:scale-95"
                  style={{
                    background: isRightSwipeBlocked
                      ? '#D0D0D0'
                      : 'linear-gradient(135deg, #61BCA6 0%, #2F76BB 100%)',
                    color: 'white',
                    fontSize: 15,
                    fontWeight: 700,
                    boxShadow: isRightSwipeBlocked ? 'none' : '0 6px 20px rgba(47,118,187,0.35)',
                    cursor: isRightSwipeBlocked ? 'not-allowed' : 'pointer',
                    opacity: isRightSwipeBlocked ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isRightSwipeBlocked ? (
                    <span className="flex items-center justify-center gap-1">
                      <Lock size={14} />
                      Premium
                    </span>
                  ) : (
                    <>
                      <Check size={20} color="white" />
                      {t('matching.connect')}
                    </>
                  )}
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
          {locationRequired || !locationSynced ? (
            <AIRightSidebarLocationEmpty
              onActivate={() => void requestBrowserLocation()}
              activating={activating}
            />
          ) : (
            <>
              {top ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-2xl" style={{ height: 130 }}>
                    {topPhoto.url ? (
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
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
                      }}
                    />
                    <div className="absolute bottom-2 left-3">
                      <p style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>{top.name}</p>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>
                        {top.service_type || top.job || top.category}
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
              ) : (
                <AIRightSidebarNoProfileEmpty />
              )}

              <div
                className="flex items-center gap-2"
                style={{ borderTop: '1px solid #F0F0F0', paddingTop: 12 }}
              >
                <AIPicksHeader
                  count={Math.min(5, matching.feed.filter((p) => p.id !== top?.id).length)}
                />
                <button
                  type="button"
                  onClick={() =>
                    void dispatch(
                      fetchSwipeFeed(
                        latitude != null && longitude != null ? { latitude, longitude } : undefined,
                      ),
                    )
                  }
                  disabled={matching.feedLoading}
                  className="ml-auto rounded-lg p-1.5 transition-colors hover:bg-[#F0F7FF] disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw
                    size={13}
                    color="#2F76BB"
                    className={matching.feedLoading ? 'animate-spin' : ''}
                  />
                </button>
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {matching.feedLoading && !matching.feedLoaded ? (
                  <div className="space-y-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-14 animate-pulse rounded-xl"
                        style={{ background: '#F5F5F5', animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                ) : matching.feed.filter((p) => p.id !== top?.id).length === 0 ? (
                  <DiscoverEmptyPicks />
                ) : (
                  matching.feed
                    .filter((p) => p.id !== top?.id)
                    .slice(0, 5)
                    .map((profile, i) => (
                      <AIRecommendationItem
                        key={profile.id}
                        profile={profile}
                        rank={i}
                        onClick={() => {
                          if (profile.is_locked || i >= 3) {
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
          onClose={() => {
            setForceQuotaModal(false);
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
