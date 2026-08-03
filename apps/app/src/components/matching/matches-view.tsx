'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  clearSwipeError,
  fetchMatchState,
  selectMatching,
  withdrawPending,
} from '@/features/matching/store/matching-slice';
import { fetchInbox, selectMessaging } from '@/features/messaging/store/messaging-slice';
import { Heart, Loader2, MessageCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function MatchesView() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const matching = useAppSelector(selectMatching);
  const messaging = useAppSelector(selectMessaging);

  useEffect(() => {
    void dispatch(fetchMatchState());
    void dispatch(fetchInbox());
  }, [dispatch]);

  const refresh = () => {
    void dispatch(fetchMatchState());
    void dispatch(fetchInbox());
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }}>
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-4 md:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold" style={{ color: matchyBrand.textDark }}>
            {t('matching.matchesTitle')}
          </h1>
          <button
            type="button"
            onClick={refresh}
            className="rounded-full p-2"
            style={{ background: matchyBrand.softBlue, color: matchyBrand.blue }}
            aria-label={t('common.retry')}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-bold tracking-wide text-[#777] uppercase">
            {t('chat.inboxTitle')}
          </h2>
          {messaging.inboxError ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-[#E74C3C]">{t(messaging.inboxError)}</p>
              <button
                type="button"
                onClick={() => void dispatch(fetchInbox())}
                className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
                style={{ background: matchyBrand.gradient }}
              >
                {t('common.retry')}
              </button>
            </div>
          ) : messaging.inboxLoading && messaging.inbox.length === 0 ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin" color={matchyBrand.teal} />
            </div>
          ) : messaging.inbox.length === 0 ? (
            <p
              className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#777]"
              style={{ border: `1px solid ${matchyBrand.border}` }}
            >
              {t('chat.emptyInbox')}
            </p>
          ) : (
            <div className="space-y-2">
              {messaging.inbox.map((row) => {
                const name = row.peer?.name || t('chat.title');
                const preview =
                  row.last_message?.message_type === 'VOICE'
                    ? t('chat.voicePreview')
                    : row.last_message?.content || t('chat.noMessages');
                return (
                  <button
                    key={row.conversation_id}
                    type="button"
                    onClick={() => router.push(`/chat/${row.conversation_id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left"
                    style={{ border: `1px solid ${matchyBrand.border}` }}
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white"
                      style={{ background: matchyBrand.gradient135 }}
                    >
                      {row.peer?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.peer.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        name.slice(0, 1)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-bold" style={{ color: matchyBrand.textDark }}>
                          {name}
                        </p>
                        {row.unread_count > 0 && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ background: matchyBrand.teal }}
                          >
                            {row.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-[#777]">{preview}</p>
                    </div>
                    <MessageCircle size={16} color={matchyBrand.teal} />
                  </button>
                );
              })}
            </div>
          )}
        </section>

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
              style={{ background: matchyBrand.gradient }}
            >
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <>
            {matching.matches.length === 0 ? (
              <div
                className="rounded-3xl bg-white px-5 py-12 text-center"
                style={{ border: `1px solid ${matchyBrand.border}` }}
              >
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: 'linear-gradient(135deg, #E8F7F3, #E8F0FA)' }}
                >
                  <Heart size={28} color={matchyBrand.teal} />
                </div>
                <p className="font-bold" style={{ color: matchyBrand.textDark }}>
                  {t('matching.noMatches')}
                </p>
                <p className="mt-2 text-sm text-[#777]">{t('matching.noMatchesDesc')}</p>
                <Link
                  href="/home"
                  className="mt-5 inline-flex rounded-2xl px-4 py-2 text-sm font-bold text-white"
                  style={{ background: matchyBrand.gradient }}
                >
                  {t('matching.exploreProfiles')}
                </Link>
              </div>
            ) : (
              <section>
                <h2 className="mb-3 text-sm font-bold tracking-wide text-[#777] uppercase">
                  {t('matching.myMatches')}
                </h2>
                <div className="space-y-2">
                  {matching.matches.map((row) => {
                    const profile = row.profile;
                    if (!profile) return null;
                    return (
                      <button
                        key={row.match_id}
                        type="button"
                        disabled={!row.conversation_id}
                        onClick={() => {
                          if (!row.conversation_id) return;
                          router.push(`/chat/${row.conversation_id}`);
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left disabled:opacity-50"
                        style={{ border: `1px solid ${matchyBrand.border}` }}
                      >
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-white"
                          style={{ background: matchyBrand.gradient135 }}
                        >
                          {profile.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={profile.image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            profile.name.slice(0, 1)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold" style={{ color: matchyBrand.textDark }}>
                            {profile.name}
                          </p>
                          <p className="truncate text-xs text-[#777]">
                            {profile.service_type || profile.job || profile.category}
                          </p>
                        </div>
                        <MessageCircle size={18} color={matchyBrand.teal} />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-1 text-sm font-bold tracking-wide text-[#777] uppercase">
                {t('matching.pendingSection')}
              </h2>
              <p className="mb-3 text-xs text-[#999]">{t('matching.pendingNoResponse')}</p>
              {matching.pending.length === 0 ? (
                <p
                  className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#777]"
                  style={{ border: `1px solid ${matchyBrand.border}` }}
                >
                  {t('matching.emptyPending')}
                </p>
              ) : (
                <div className="space-y-2">
                  {matching.pending.map((row) => (
                    <div
                      key={row.swipe_id}
                      className="flex items-center gap-3 rounded-2xl bg-white p-3"
                      style={{ border: `1px solid ${matchyBrand.border}` }}
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white"
                        style={{ background: matchyBrand.gradient135 }}
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
                        <p className="truncate font-bold" style={{ color: matchyBrand.textDark }}>
                          {row.profile.name}
                        </p>
                        <p className="truncate text-xs text-[#777]">
                          {row.profile.service_type || row.profile.job || row.profile.category}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={matching.withdrawLoadingId === row.profile.id}
                        onClick={() => void dispatch(withdrawPending(row.profile.id))}
                        className="rounded-xl px-3 py-2 text-xs font-bold"
                        style={{ background: matchyBrand.softBlue, color: matchyBrand.blue }}
                      >
                        {matching.withdrawLoadingId === row.profile.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          t('matching.cancelPending')
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
