'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  clearSwipeError,
  fetchMatchState,
  selectMatching,
  withdrawPending,
} from '@/features/matching/store/matching-slice';
import { Loader2, RefreshCw, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export function MatchesView() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const matching = useAppSelector(selectMatching);

  useEffect(() => {
    void dispatch(fetchMatchState());
  }, [dispatch]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E]">{t('matching.matchesTitle')}</h1>
        <button
          type="button"
          onClick={() => void dispatch(fetchMatchState())}
          className="rounded-full bg-[#EEF2F7] p-2 text-[#2F76BB]"
          aria-label={t('common.retry')}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {matching.swipeError && (
        <div className="flex items-center justify-between rounded-2xl bg-[#FFF0F0] px-4 py-3 text-sm text-[#E74C3C]">
          <span>{t(matching.swipeError)}</span>
          <button type="button" onClick={() => dispatch(clearSwipeError())}>
            {t('common.close')}
          </button>
        </div>
      )}

      {matching.matchesLoading && matching.matches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-[#777]">
          <Loader2 className="h-8 w-8 animate-spin text-[#61BCA6]" />
          <p>{t('matching.loadingMatches')}</p>
        </div>
      ) : matching.matchesError ? (
        <div className="space-y-3 py-10 text-center">
          <p className="text-sm text-[#E74C3C]">{t(matching.matchesError)}</p>
          <button
            type="button"
            onClick={() => void dispatch(fetchMatchState())}
            className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: 'linear-gradient(90deg, #61BCA6, #2F76BB)' }}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-bold tracking-wide text-[#777] uppercase">
              {t('matching.myMatches')}
            </h2>
            {matching.matches.length === 0 ? (
              <div className="rounded-3xl bg-[#F5F7FA] px-5 py-10 text-center">
                <p className="font-bold text-[#1A1A2E]">{t('matching.noMatches')}</p>
                <p className="mt-2 text-sm text-[#777]">{t('matching.noMatchesDesc')}</p>
                <Link
                  href="/discover"
                  className="mt-4 inline-flex rounded-2xl px-4 py-2 text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(90deg, #61BCA6, #2F76BB)' }}
                >
                  {t('matching.exploreProfiles')}
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {matching.matches.map((row) => {
                  const profile = row.profile;
                  if (!profile) return null;
                  return (
                    <div
                      key={row.match_id}
                      className="flex items-center gap-3 rounded-2xl border border-[#EEF2F7] bg-white p-3 shadow-sm"
                    >
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
                      >
                        {profile.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={profile.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          profile.name.slice(0, 1)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-[#1A1A2E]">{profile.name}</p>
                        <p className="truncate text-xs text-[#777]">
                          {profile.service_type || profile.job || profile.category}
                        </p>
                      </div>
                      <UserRound size={18} className="text-[#61BCA6]" />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-1 text-sm font-bold tracking-wide text-[#777] uppercase">
              {t('matching.pendingSection')}
            </h2>
            <p className="mb-3 text-xs text-[#999]">{t('matching.pendingNoResponse')}</p>
            {matching.pending.length === 0 ? (
              <p className="rounded-2xl bg-[#F5F7FA] px-4 py-6 text-center text-sm text-[#777]">
                {t('matching.emptyPending')}
              </p>
            ) : (
              <div className="space-y-2">
                {matching.pending.map((row) => (
                  <div
                    key={row.swipe_id}
                    className="flex items-center gap-3 rounded-2xl border border-[#EEF2F7] bg-white p-3"
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white"
                      style={{ background: '#2F76BB' }}
                    >
                      {row.profile.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.profile.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        row.profile.name.slice(0, 1)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#1A1A2E]">{row.profile.name}</p>
                      <p className="truncate text-xs text-[#777]">
                        {row.profile.service_type || row.profile.job}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={matching.withdrawLoadingId === row.profile.id}
                      onClick={() => {
                        void (async () => {
                          try {
                            await dispatch(withdrawPending(row.profile.id));
                          } catch {
                            // Errors are stored on the matching slice via rejectWithValue.
                          }
                        })();
                      }}
                      className="rounded-xl border border-[#F5C6C6] px-3 py-2 text-xs font-bold text-[#E74C3C] disabled:opacity-50"
                    >
                      {matching.withdrawLoadingId === row.profile.id
                        ? t('matching.withdrawing')
                        : t('matching.cancelPending')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
