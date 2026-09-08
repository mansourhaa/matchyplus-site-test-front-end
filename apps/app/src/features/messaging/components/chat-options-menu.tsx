'use client';

import { useAppDispatch } from '@/features/auth/hooks';
import { useI18n } from '@/features/i18n/i18n-provider';
import { ProfileDetailModal } from '@/features/matching/components/profile-detail-modal';
import { blockUser, unmatchUser } from '@/features/matching/store/matching-slice';
import { setActiveConversation } from '@/features/messaging/store/messaging-slice';
import type { ConversationPeer } from '@/features/messaging/types';
import { reportProfile } from '@/features/profile/store/profile-slice';
import {
  Ban,
  CheckCircle2,
  Flag,
  HeartOff,
  Loader2,
  MoreVertical,
  Shield,
  ShieldAlert,
  User,
  UserX,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type ChatOptionsMenuProps = {
  peer: ConversationPeer | null | undefined;
  conversationId: string;
};

type ReportReason = 'INAPPROPRIATE' | 'SPAM' | 'FAKE' | 'HARASSMENT' | 'OTHER';

export function ChatOptionsMenu({ peer, conversationId }: ChatOptionsMenuProps) {
  const { t, dir } = useI18n();
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [unmatchLoading, setUnmatchLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason>('INAPPROPRIATE');
  const [reportDetails, setReportDetails] = useState('');

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  const peerId = peer?.id;
  const peerName = peer?.name || 'User';

  const handleUnmatch = async () => {
    if (!peerId || unmatchLoading) return;
    setUnmatchLoading(true);
    try {
      await dispatch(unmatchUser(peerId)).unwrap();
      dispatch(setActiveConversation(null));
      setShowUnmatchModal(false);
      setShowReportModal(false);
      router.push('/matches');
    } catch {
      // Error handled by matching-slice
    } finally {
      setUnmatchLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!peerId || blockLoading) return;
    setBlockLoading(true);
    try {
      await dispatch(blockUser(peerId)).unwrap();
      dispatch(setActiveConversation(null));
      setShowBlockModal(false);
      setShowReportModal(false);
      router.push('/matches');
    } catch {
      // Error handled by matching-slice
    } finally {
      setBlockLoading(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peerId || reportLoading) return;
    setReportLoading(true);
    try {
      await dispatch(
        reportProfile({
          userId: peerId,
          reason: selectedReason,
          details: reportDetails.trim() || undefined,
        }),
      ).unwrap();

      if (alsoBlock) {
        await dispatch(blockUser(peerId)).unwrap();
        dispatch(setActiveConversation(null));
        setShowReportModal(false);
        router.push('/matches');
      } else {
        setReportSubmitted(true);
      }
    } catch {
      // Handled in thunk
    } finally {
      setReportLoading(false);
    }
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportSubmitted(false);
    setReportDetails('');
    setAlsoBlock(false);
  };

  return (
    <div className="relative" ref={menuRef} dir={dir}>
      {/* Menu Trigger Button */}
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-slate-100 active:scale-95"
        aria-label={t('chat.options.button')}
        aria-haspopup="true"
        aria-expanded={menuOpen}
      >
        <MoreVertical size={20} />
      </button>

      {/* Options Dropdown */}
      {menuOpen && (
        <div
          className="absolute top-full right-0 z-50 mt-1 w-56 rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-black/5"
          style={{ border: '1px solid #EAEAEA' }}
        >
          {/* View Profile */}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setShowProfileModal(true);
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-[#1E293B] transition-colors hover:bg-slate-50"
          >
            <User size={16} className="text-[#2F76BB]" />
            {t('chat.options.viewProfile')}
          </button>

          {/* Report User */}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setReportSubmitted(false);
              setShowReportModal(true);
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-[#D97706] transition-colors hover:bg-amber-50"
          >
            <Flag size={16} className="text-[#F59E0B]" />
            {t('chat.options.report')}
          </button>

          <div className="my-1 border-t border-slate-100" />

          {/* Unmatch */}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setShowUnmatchModal(true);
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-[#E24E59] transition-colors hover:bg-rose-50"
          >
            <HeartOff size={16} className="text-[#E24E59]" />
            {t('chat.options.unmatch')}
          </button>

          {/* Block User */}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setShowBlockModal(true);
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-[#DC2626] transition-colors hover:bg-rose-50"
          >
            <Ban size={16} className="text-[#DC2626]" />
            {t('chat.options.block')}
          </button>
        </div>
      )}

      {/* 1. Profile Detail Modal */}
      {showProfileModal && peer && (
        <ProfileDetailModal
          profile={{
            id: peer.id,
            name: peer.name || '',
            image: peer.image ?? null,
            bio: peer.bio ?? null,
            job: peer.job ?? null,
            category: peer.category ?? null,
            city: peer.city ?? null,
            interests: peer.interests ?? [],
            activity_sector: peer.activity_sector ?? null,
            service_type: peer.service_type ?? null,
            offer_service: Boolean(peer.service_type),
            rating: 5.0,
            matched: true,
          }}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* 2. Unmatch Confirmation Modal */}
      {showUnmatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-[#E24E59]">
              <HeartOff size={28} />
            </div>
            <h3 className="text-center text-base font-extrabold text-[#1E293B]">
              {t('chat.dialogs.unmatchTitle', { name: peerName })}
            </h3>
            <p className="mt-2 text-center text-xs leading-relaxed text-[#64748B]">
              {t('chat.dialogs.unmatchDesc', { name: peerName })}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={unmatchLoading}
                onClick={() => setShowUnmatchModal(false)}
                className="flex-1 rounded-2xl py-2.5 text-xs font-bold text-[#64748B] transition-colors hover:bg-slate-100"
                style={{ border: '1px solid #E2E8F0' }}
              >
                {t('chat.dialogs.cancel')}
              </button>
              <button
                type="button"
                disabled={unmatchLoading}
                onClick={handleUnmatch}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#E24E59] py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {unmatchLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  t('chat.dialogs.unmatchConfirm')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Block Confirmation Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-[#DC2626]">
              <Ban size={28} />
            </div>
            <h3 className="text-center text-base font-extrabold text-[#1E293B]">
              {t('chat.dialogs.blockTitle', { name: peerName })}
            </h3>
            <p className="mt-2 text-center text-xs leading-relaxed text-[#64748B]">
              {t('chat.dialogs.blockDesc', { name: peerName })}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={blockLoading}
                onClick={() => setShowBlockModal(false)}
                className="flex-1 rounded-2xl py-2.5 text-xs font-bold text-[#64748B] transition-colors hover:bg-slate-100"
                style={{ border: '1px solid #E2E8F0' }}
              >
                {t('chat.dialogs.cancel')}
              </button>
              <button
                type="button"
                disabled={blockLoading}
                onClick={handleBlock}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#DC2626] py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {blockLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  t('chat.dialogs.blockConfirm')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Report Modal (Facebook Style Safety Workflow) */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-[#F59E0B]" />
                <h3 className="text-sm font-extrabold text-[#1E293B]">
                  {reportSubmitted
                    ? t('chat.dialogs.postReportTitle')
                    : t('chat.dialogs.reportTitle', { name: peerName })}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeReportModal}
                className="rounded-full p-1 text-[#94A3B8] transition-colors hover:text-[#1E293B]"
              >
                <X size={16} />
              </button>
            </div>

            {reportSubmitted ? (
              /* Facebook Post-Report Recommended Actions Screen */
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/80 p-3.5">
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                  <p className="text-xs leading-relaxed font-medium text-emerald-950">
                    {t('chat.dialogs.postReportDesc')}
                  </p>
                </div>

                <div>
                  <p className="mb-2.5 text-xs font-bold text-[#1E293B]">
                    {t('chat.dialogs.postReportActionsHeader')}
                  </p>

                  <div className="space-y-2.5">
                    {/* Action 1: Block User */}
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1E293B]">
                          {t('chat.dialogs.blockActionTitle', { name: peerName })}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-[#64748B]">
                          {t('chat.dialogs.blockActionDesc')}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={blockLoading}
                        onClick={handleBlock}
                        className="shrink-0 rounded-xl bg-[#DC2626] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
                      >
                        {blockLoading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          t('chat.dialogs.blockConfirm')
                        )}
                      </button>
                    </div>

                    {/* Action 2: Unmatch */}
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1E293B]">
                          {t('chat.dialogs.unmatchActionTitle', { name: peerName })}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-[#64748B]">
                          {t('chat.dialogs.unmatchActionDesc')}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={unmatchLoading}
                        onClick={handleUnmatch}
                        className="shrink-0 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-300 disabled:opacity-50"
                      >
                        {unmatchLoading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          t('chat.dialogs.unmatchConfirm')
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={closeReportModal}
                    className="w-full rounded-2xl bg-[#2F76BB] py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95"
                  >
                    {t('chat.dialogs.doneButton')}
                  </button>
                </div>
              </div>
            ) : (
              /* Facebook Report Reason Form */
              <form onSubmit={handleReport} className="mt-4 space-y-4">
                <p className="text-xs text-[#64748B]">{t('chat.dialogs.reportDesc')}</p>

                <div className="space-y-2">
                  {(
                    [
                      { key: 'INAPPROPRIATE', label: t('chat.dialogs.reasonInappropriate') },
                      { key: 'SPAM', label: t('chat.dialogs.reasonSpam') },
                      { key: 'FAKE', label: t('chat.dialogs.reasonFake') },
                      { key: 'HARASSMENT', label: t('chat.dialogs.reasonHarassment') },
                      { key: 'OTHER', label: t('chat.dialogs.reasonOther') },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.key}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl p-3 text-xs font-semibold transition-colors ${
                        selectedReason === option.key
                          ? 'border border-amber-300 bg-amber-50/70 text-amber-900'
                          : 'border border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={option.key}
                        checked={selectedReason === option.key}
                        onChange={() => setSelectedReason(option.key)}
                        className="accent-[#F59E0B]"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder={t('chat.dialogs.detailsPlaceholder')}
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs focus:border-[#F59E0B] focus:outline-hidden"
                  />
                </div>

                {/* Facebook Style Inline Block Option */}
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-rose-200/60 bg-rose-50/60 p-3">
                  <input
                    type="checkbox"
                    checked={alsoBlock}
                    onChange={(e) => setAlsoBlock(e.target.checked)}
                    className="mt-0.5 rounded accent-[#DC2626]"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-rose-950">
                      {t('chat.dialogs.alsoBlockOption', { name: peerName })}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-rose-800/80">
                      {t('chat.dialogs.alsoBlockDesc')}
                    </p>
                  </div>
                </label>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={reportLoading}
                    onClick={closeReportModal}
                    className="flex-1 rounded-2xl py-2.5 text-xs font-bold text-[#64748B] transition-colors hover:bg-slate-100"
                    style={{ border: '1px solid #E2E8F0' }}
                  >
                    {t('chat.dialogs.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={reportLoading}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#F59E0B] py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
                  >
                    {reportLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      t('chat.dialogs.reportConfirm')
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
