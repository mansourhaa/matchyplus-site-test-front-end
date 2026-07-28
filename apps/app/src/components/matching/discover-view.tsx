'use client';

import { MatchCelebrationModal } from '@/components/matching/match-celebration-modal';
import { ProfileDetailModal } from '@/components/matching/profile-detail-modal';
import { SwipeLimitModal } from '@/components/matching/swipe-limit-modal';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  clearCelebration,
  clearSwipeError,
  closeQuotaModal,
  fetchMatchState,
  fetchSwipeFeed,
  selectMatching,
  selectTopFeedProfile,
  swipeProfile,
} from '@/features/matching/store/matching-slice';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eye, Loader2, RefreshCw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function scoreColor(score: number) {
  if (score >= 75) return '#61BCA6';
  if (score >= 55) return '#2F76BB';
  return '#F5A623';
}

export function DiscoverView() {
  const { t, locale, setLocale } = useI18n();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const matching = useAppSelector(selectMatching);
  const top = useAppSelector(selectTopFeedProfile);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    void dispatch(fetchSwipeFeed());
  }, [dispatch]);

  const quotaLabel = matching.quota?.unlimited
    ? t('matching.quotaUnlimited')
    : matching.quota?.remaining != null
      ? t('matching.quotaLeft', { remaining: matching.quota.remaining })
      : null;

  const onPass = async () => {
    if (!top || matching.swipeLoading) return;
    try {
      await dispatch(swipeProfile({ targetUserId: top.id, direction: 'left', profile: top }));
    } catch {
      // Errors are stored on the matching slice via rejectWithValue.
    }
  };

  const onConnect = async () => {
    if (!top || matching.swipeLoading) return;
    try {
      const result = await dispatch(
        swipeProfile({ targetUserId: top.id, direction: 'right', profile: top }),
      );
      if (swipeProfile.fulfilled.match(result) && result.payload.match) {
        void dispatch(fetchMatchState());
      }
    } catch {
      // Errors are stored on the matching slice via rejectWithValue.
    }
  };

  return (
    <div className="mx-auto flex h-full min-h-[70vh] w-full max-w-md flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E]">{t('matching.title')}</h1>
        <div className="flex items-center gap-2">
          {(['en', 'fr', 'ar'] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className="rounded-full px-2.5 py-1 text-xs font-bold uppercase"
              style={{
                background: locale === code ? '#2F76BB' : '#EEF2F7',
                color: locale === code ? 'white' : '#555',
              }}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {quotaLabel && (
        <div className="mb-3 rounded-2xl bg-[#F0F7F5] px-4 py-2 text-center text-xs font-semibold text-[#2F76BB]">
          {quotaLabel}
        </div>
      )}

      {matching.swipeError && (
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-[#FFF0F0] px-4 py-3 text-sm text-[#E74C3C]">
          <span>{t(matching.swipeError)}</span>
          <button
            type="button"
            onClick={() => dispatch(clearSwipeError())}
            className="font-semibold"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {matching.feedLoading && !matching.feedLoaded ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#777]">
          <Loader2 className="h-8 w-8 animate-spin text-[#61BCA6]" />
          <p>{t('matching.loadingFeed')}</p>
        </div>
      ) : matching.feedError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-[#E74C3C]">{t(matching.feedError)}</p>
          <button
            type="button"
            onClick={() => void dispatch(fetchSwipeFeed())}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: 'linear-gradient(90deg, #61BCA6, #2F76BB)' }}
          >
            <RefreshCw size={16} />
            {t('common.retry')}
          </button>
        </div>
      ) : !top ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-[#777]">{t('matching.noProfiles')}</p>
          <button
            type="button"
            onClick={() => void dispatch(fetchSwipeFeed())}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: 'linear-gradient(90deg, #61BCA6, #2F76BB)' }}
          >
            <RefreshCw size={16} />
            {t('matching.refreshFeed')}
          </button>
        </div>
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={top.id}
              className="relative flex-1 overflow-hidden rounded-[28px] shadow-lg"
              style={{ minHeight: 480, background: '#1A1A2E' }}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              {top.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={top.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-7xl font-bold text-white">
                  {top.name.slice(0, 1)}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div
                className="absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-extrabold text-white"
                style={{ background: scoreColor(top.match_score) }}
              >
                {t('matching.scoreLabel')} {Math.round(top.match_score)}%
              </div>

              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="absolute top-4 right-4 rounded-full bg-black/35 p-2.5 text-white"
                aria-label={t('matching.seeDetails')}
              >
                <Eye size={18} />
              </button>

              <div className="absolute right-0 bottom-0 left-0 p-5 text-white">
                <h2 className="text-2xl font-extrabold">{top.name}</h2>
                <p className="mt-1 text-sm text-white/85">
                  {top.service_type || top.job || top.activity_sector || top.category}
                </p>
                {top.city && <p className="mt-1 text-xs text-white/70">{top.city}</p>}
                {top.distance_km != null && (
                  <p className="mt-1 text-xs font-semibold text-[#9BE7D5]">
                    {t('matching.kmAway', { km: top.distance_km })}
                  </p>
                )}
                {top.interests?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {top.interests.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex items-center justify-center gap-6">
            <button
              type="button"
              disabled={matching.swipeLoading}
              onClick={() => void onPass()}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#E8E8E8] bg-white text-[#E74C3C] shadow disabled:opacity-50"
              aria-label={t('matching.pass')}
            >
              {matching.swipeLoading ? <Loader2 className="animate-spin" /> : <X size={28} />}
            </button>
            <button
              type="button"
              disabled={matching.swipeLoading}
              onClick={() => void onConnect()}
              className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
              aria-label={t('matching.connect')}
            >
              {matching.swipeLoading ? <Loader2 className="animate-spin" /> : <Check size={28} />}
            </button>
          </div>
        </>
      )}

      {detailOpen && top && (
        <ProfileDetailModal
          profile={top}
          busy={matching.swipeLoading}
          onClose={() => setDetailOpen(false)}
          onPass={() => {
            setDetailOpen(false);
            void onPass();
          }}
          onConnect={() => {
            setDetailOpen(false);
            void onConnect();
          }}
        />
      )}

      {matching.showQuotaModal && <SwipeLimitModal onClose={() => dispatch(closeQuotaModal())} />}

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
