'use client';

import { AuthenticatedProfileAvatar } from '@/components/matchy/authenticated-profile-image';
import { matchyBrand } from '@/components/matchy/brand';
import { MatchyHeaderActions } from '@/components/matchy/matchy-header-actions';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  clearSwipeError,
  fetchMatchState,
  selectMatching,
  withdrawPending,
} from '@/features/matching/store/matching-slice';
import { getFirstName, getShortDisplayName } from '@/features/messaging/lib/icebreakers';
import { fetchInbox, selectMessaging } from '@/features/messaging/store/messaging-slice';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Heart,
  Loader2,
  MessageSquare,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function MatchesView() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const matching = useAppSelector(selectMatching);
  const messaging = useAppSelector(selectMessaging);
  const [pendingOpen, setPendingOpen] = useState(true);

  useEffect(() => {
    void dispatch(fetchMatchState());
    void dispatch(fetchInbox());
  }, [dispatch]);

  const visibleInbox = messaging.inbox.filter((row) => !row.i_blocked && !row.blocked_me);

  const hasNoMatchesAtAll =
    !matching.matchesLoading &&
    !messaging.inboxLoading &&
    matching.matches.length === 0 &&
    matching.pending.length === 0 &&
    visibleInbox.length === 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto" style={{ background: matchyBrand.bg }}>
      <div
        className="sticky top-0 z-20 flex shrink-0 items-center justify-between px-4 py-3 md:px-8"
        style={{ background: matchyBrand.bg, borderBottom: '1px solid rgba(0,0,0,0.05)' }}
      >
        <h1
          className="text-xl font-bold md:text-2xl md:font-extrabold"
          style={{ color: matchyBrand.textDark }}
        >
          {t('matching.matchesTitle')}
        </h1>
        <MatchyHeaderActions />
      </div>

      {matching.swipeError && (
        <div className="mx-4 mb-4 flex items-center justify-between rounded-2xl bg-[#FFF0F0] px-4 py-3 text-sm text-[#E74C3C] md:mx-8">
          <span>{t(matching.swipeError)}</span>
          <button type="button" onClick={() => dispatch(clearSwipeError())}>
            {t('common.close')}
          </button>
        </div>
      )}

      {hasNoMatchesAtAll ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <div
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: 'linear-gradient(135deg, #E8F7F3, #E8F0FA)' }}
          >
            <Heart size={36} color="#61BCA6" />
          </div>
          <p style={{ fontSize: '18px', fontWeight: 800, color: '#353535' }}>
            {t('chat.emptyInbox')}
          </p>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '8px', lineHeight: '1.6' }}>
            {t('chat.emptyInboxDesc')}
            <br />
            {t('chat.emptyInboxDescSuffix')} <strong style={{ color: '#61BCA6' }}>Match</strong> !
          </p>
          <Link
            href="/home"
            className="mt-6 rounded-xl px-6 py-3 text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {t('chat.emptyInboxCta')}
          </Link>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-2 md:px-8">
          {/* 1. TOP SECTION: Mes Matchs (Horizontal Avatar Row) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Heart size={16} className="fill-[#E24E59] text-[#E24E59]" />
              <h2 className="text-sm font-bold text-[#1E293B]">{t('matching.myMatches')}</h2>
              {matching.matches.length > 0 && (
                <span className="rounded-full bg-[#61BCA6] px-2 py-0.5 text-[11px] leading-none font-bold text-white">
                  {matching.matches.length}
                </span>
              )}
            </div>

            {matching.matchesLoading && matching.matches.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-[#777]">
                <Loader2 className="h-6 w-6 animate-spin text-[#61BCA6]" />
              </div>
            ) : matching.matches.length === 0 ? (
              <div
                className="rounded-3xl bg-white p-6 text-center shadow-xs"
                style={{ border: `1px solid ${matchyBrand.border}` }}
              >
                <p className="text-sm font-bold text-[#353535]">{t('matching.noMatches')}</p>
                <p className="mt-1 text-xs text-[#777]">{t('matching.noMatchesHint')}</p>
                <Link
                  href="/discover"
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-sm"
                  style={{ background: matchyBrand.gradient }}
                >
                  <Sparkles size={14} />
                  {t('matching.goToDiscover')}
                </Link>
              </div>
            ) : (
              <div className="-mx-1 flex gap-4 overflow-x-auto px-1 py-1 pb-2">
                {matching.matches.map((row) => {
                  const profile = row.profile;
                  if (!profile) return null;
                  const firstName = getFirstName(profile.name);
                  return (
                    <button
                      key={`avatar-${row.match_id}`}
                      type="button"
                      onClick={() => {
                        if (row.conversation_id) {
                          router.push(`/chat/${row.conversation_id}`);
                        } else {
                          router.push(`/profile/${profile.id}`);
                        }
                      }}
                      className="flex w-16 shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
                      aria-label={`Voir le profil de ${profile.name}`}
                    >
                      <div className="relative flex flex-col items-center">
                        <div className="rounded-full border-2 border-[#61BCA6] p-0.5 shadow-sm">
                          <AuthenticatedProfileAvatar
                            image={profile.image}
                            name={profile.name}
                            sizeClassName="h-14 w-14"
                            roundedClassName="rounded-full"
                            textClassName="text-base font-bold text-white"
                          />
                        </div>
                        <span className="z-10 -mt-2.5 rounded-full bg-[#61BCA6] px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase shadow-xs">
                          {t('matching.newBadge')}
                        </span>
                      </div>
                      <span className="w-full truncate text-center text-xs font-semibold text-[#444]">
                        {firstName}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 2. MIDDLE SECTION: CONVERSATIONS */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold tracking-wider text-[#888] uppercase">
              {t('matching.conversationsTitle')}
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
            ) : messaging.inboxLoading && visibleInbox.length === 0 ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin" color={matchyBrand.teal} />
              </div>
            ) : visibleInbox.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-10 text-center shadow-xs"
                style={{ border: `1px solid ${matchyBrand.border}` }}
              >
                <div
                  className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
                  style={{ background: 'linear-gradient(135deg, #E8F7F3, #E8F0FA)' }}
                >
                  <Heart size={36} color="#61BCA6" />
                </div>
                <h3 className="text-base font-extrabold" style={{ color: matchyBrand.textDark }}>
                  {t('chat.emptyInbox')}
                </h3>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-[#888]">
                  {t('chat.emptyInboxDesc')}
                </p>
                <Link
                  href="/home"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                  style={{ background: matchyBrand.gradient }}
                >
                  <Sparkles size={14} />
                  {t('chat.emptyInboxCta')}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleInbox.map((row) => {
                  const name =
                    getShortDisplayName(row.peer?.name) || row.peer?.name || t('chat.title');
                  const role = row.peer?.job || row.peer?.category || '';
                  const isVoice = row.last_message?.message_type === 'VOICE';
                  const preview = isVoice
                    ? t('chat.voicePreview')
                    : row.last_message?.content || t('matching.startConversationSnippet');

                  return (
                    <button
                      key={row.conversation_id}
                      type="button"
                      onClick={() => router.push(`/chat/${row.conversation_id}`)}
                      className="flex w-full items-center gap-3.5 rounded-3xl bg-white p-4 text-left shadow-sm transition-all hover:border-[#D6E8FA] hover:shadow-md"
                      style={{ border: '1px solid #F0F0F0' }}
                    >
                      <div className="relative shrink-0">
                        <AuthenticatedProfileAvatar
                          image={row.peer?.image}
                          name={name}
                          sizeClassName="h-14 w-14"
                          roundedClassName="rounded-full"
                          textClassName="text-base font-bold text-white"
                        />
                        <span className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#10B981]" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[15px] font-extrabold text-[#1E293B]">
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
                        <div className="flex items-center gap-1.5 text-xs text-[#888]">
                          <MessageSquare size={13} className="shrink-0 text-[#94A3B8]" />
                          <span className="truncate">{preview}</span>
                        </div>
                        {role && (
                          <p className="truncate pt-0.5 text-xs font-semibold text-[#2F76BB]">
                            {role}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. BOTTOM SECTION: EN ATTENTE */}
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setPendingOpen((open) => !open)}
              className="flex w-full items-center justify-between py-1 text-left"
            >
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#F59E0B]" />
                <h2 className="text-xs font-bold tracking-wider text-[#F59E0B] uppercase">
                  {t('matching.pendingSection')}
                </h2>
                {matching.pending.length > 0 && (
                  <span className="rounded-full border border-[#F59E0B] bg-[#FFFBEB] px-2 py-0.5 text-[10px] leading-none font-bold text-[#F59E0B]">
                    {matching.pending.length}
                  </span>
                )}
              </div>
              <div className="text-[#888]">
                {pendingOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {pendingOpen && (
              <div>
                {matching.pending.length === 0 ? (
                  <p
                    className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#777]"
                    style={{ border: `1px solid ${matchyBrand.border}` }}
                  >
                    {t('matching.emptyPending')}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {matching.pending.map((row) => (
                      <div
                        key={row.swipe_id}
                        className="flex items-center gap-3.5 rounded-2xl border border-[#F0F0F0] bg-white p-3.5 shadow-sm"
                      >
                        <AuthenticatedProfileAvatar
                          image={row.profile.image}
                          name={row.profile.name}
                          sizeClassName="h-12 w-12"
                          roundedClassName="rounded-full"
                          textClassName="text-sm font-bold text-white"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#1E293B]">
                            {getShortDisplayName(row.profile.name) || row.profile.name}
                          </p>
                          <p className="truncate text-xs text-[#777]">
                            {row.profile.service_type || row.profile.job || row.profile.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 rounded-full border border-[#F59E0B] bg-[#FFFBEB] px-3 py-1 text-xs font-semibold text-[#F59E0B]">
                            <Clock size={12} />
                            {t('matching.pendingBadge')}
                          </span>
                          <button
                            type="button"
                            disabled={matching.withdrawLoadingId === row.profile.id}
                            onClick={() => void dispatch(withdrawPending(row.profile.id))}
                            className="rounded-full p-1.5 text-[#AAA] transition-colors hover:bg-[#FFF0F0] hover:text-[#E24E59]"
                            title={t('matching.cancelPending')}
                            aria-label={t('matching.cancelPending')}
                          >
                            {matching.withdrawLoadingId === row.profile.id ? (
                              <Loader2 size={14} className="animate-spin text-[#E24E59]" />
                            ) : (
                              <X size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                    <p className="pt-2 text-center text-xs text-[#94A3B8]">
                      {t('matching.pendingFooter')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
