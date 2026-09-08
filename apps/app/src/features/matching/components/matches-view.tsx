'use client';

import { AuthenticatedProfileAvatar } from '@/components/matchy/authenticated-profile-image';
import { matchyBrand } from '@/components/matchy/brand';
import { MatchyHeaderActions } from '@/components/matchy/matchy-header-actions';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import { formatRole } from '@/features/matching/lib/format-role';
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
      {matching.swipeError && (
        <div className="mx-4 mb-4 flex items-center justify-between rounded-2xl bg-[#FFF0F0] px-4 py-3 text-sm text-[#E74C3C] md:mx-8">
          <span>{t(matching.swipeError)}</span>
          <button type="button" onClick={() => dispatch(clearSwipeError())}>
            {t('common.close')}
          </button>
        </div>
      )}

      {hasNoMatchesAtAll ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          {/* Circular mint icon with heart */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F7F3] shadow-xs">
            <Heart size={36} className="text-[#61BCA6]" strokeWidth={2} />
          </div>

          {/* Title */}
          <h2 className="mb-2 text-lg font-bold text-[#1E293B] md:text-xl">
            {t('matching.noMatches')}
          </h2>

          {/* Subtitle description */}
          <p className="mb-1 text-xs text-[#64748B] md:text-sm">{t('matching.noMatchesHint')}</p>
          <p className="mb-8 text-xs text-[#64748B] md:text-sm">
            {t('matching.noMatchesSubtitle')}{' '}
            <span className="font-bold text-[#61BCA6]">{t('matching.matchWord')}</span>
          </p>

          {/* CTA Button */}
          <Link
            href="/home"
            className="inline-flex items-center justify-center rounded-2xl px-7 py-3 text-xs font-bold text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg active:scale-95 md:text-sm"
            style={{ background: matchyBrand.gradient }}
          >
            {t('matching.goToDiscover')}
          </Link>
        </div>
      ) : (
        <div className="w-full space-y-6 px-4 py-2 md:px-8">
          {/* 1. TOP SECTION: Mes Matchs (Horizontal Avatar Row) */}
          {(matching.matchesLoading || matching.matches.length > 0) && (
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
          )}

          {/* 2. MIDDLE SECTION: CONVERSATIONS */}
          {(messaging.inboxLoading || messaging.inboxError || visibleInbox.length > 0) && (
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
              ) : (
                <div className="space-y-3">
                  {visibleInbox.map((row) => {
                    const name =
                      getShortDisplayName(row.peer?.name) || row.peer?.name || t('chat.title');
                    const rawRole = row.peer?.job || row.peer?.category || '';
                    const role = formatRole(rawRole, t);
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
          )}

          {/* 3. BOTTOM SECTION: EN ATTENTE */}
          {matching.pending.length > 0 && (
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
                  <span className="rounded-full border border-[#F59E0B] bg-[#FFFBEB] px-2 py-0.5 text-[10px] leading-none font-bold text-[#F59E0B]">
                    {matching.pending.length}
                  </span>
                </div>
                <div className="text-[#888]">
                  {pendingOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {pendingOpen && (
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
                          {formatRole(
                            row.profile.service_type || row.profile.job || row.profile.category,
                            t,
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 rounded-full border-[1.5px] border-[#F59E0B] bg-[#FFFDF0] px-3 py-1 text-xs font-bold text-[#F59E0B]">
                          <Clock size={13} color="#F59E0B" />
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}
