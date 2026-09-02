'use client';

import { AuthenticatedProfileAvatar } from '@/components/matchy/authenticated-profile-image';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { FeedProfile } from '@/features/matching/types';
import { motion } from 'framer-motion';
import { Check, Heart, MessageCircle } from 'lucide-react';

type Props = {
  profile:
    | FeedProfile
    | {
        id: string;
        name: string;
        image: string | null;
        job?: string | null;
        service_type?: string | null;
      };
  onContinue: () => void;
  onViewMatches: () => void;
};

export function MatchCelebrationModal({ profile, onContinue, onViewMatches }: Props) {
  const { t, dir } = useI18n();

  const profileJob =
    ('job' in profile && profile.job) || ('service_type' in profile && profile.service_type) || '';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto p-4 sm:p-6"
      style={{ background: 'rgba(11, 17, 32, 0.96)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      dir={dir}
    >
      {/* Top Floating Notification Banner */}
      <motion.div
        className="mx-auto flex w-full max-w-sm shrink-0 items-center gap-3 rounded-2xl bg-white p-3.5 shadow-2xl"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <Heart size={20} strokeWidth={2} className="text-rose-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-[#1E293B]">
            {t('matching.newMatchTitle') || 'Nouveau match'}
          </p>
          <p className="truncate text-[11px] font-medium text-[#64748B]">
            {t('matching.newMatchSubtitle') ||
              'Vous avez un nouveau match. Commencez la conversation !'}
          </p>
        </div>
      </motion.div>

      {/* Center Celebration Content */}
      <motion.div
        className="my-auto flex flex-col items-center justify-center py-6 text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.35 }}
      >
        {/* Celebration Emojis Row */}
        <div className="mb-3 flex items-center justify-center gap-3 text-3xl tracking-widest select-none">
          <span>❤️</span>
          <span>🎉</span>
          <span>✨</span>
          <span>💬</span>
          <span>🎊</span>
        </div>

        {/* Main Heading */}
        <h2 className="text-3xl font-black tracking-tight text-[#38BDF8] drop-shadow-md sm:text-4xl">
          {t('matching.itsAMatch')}
        </h2>

        {/* Subtitle Message */}
        <p className="mt-3 text-xs leading-relaxed font-semibold text-white/90 sm:text-sm">
          {t('matching.acceptedDemand', { name: profile.name })}
        </p>
        <p className="mt-0.5 text-xs font-medium text-white/70">{t('matching.canChatNow')}</p>

        {/* Circular Avatar with Glowing Border & Mutual Match Badge */}
        <div className="relative mt-7 flex flex-col items-center">
          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#38BDF8] bg-[#9333EA] shadow-[0_0_30px_rgba(56,189,248,0.35)]">
            <AuthenticatedProfileAvatar
              image={profile.image}
              name={profile.name}
              sizeClassName="h-full w-full"
              roundedClassName="rounded-full"
              textClassName="text-4xl font-black text-white"
            />
          </div>

          {/* Overlapping Bottom Badge */}
          <div className="absolute -bottom-3 flex items-center gap-1 rounded-full bg-[#61BCA6] px-3.5 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-lg">
            <Check size={12} strokeWidth={3} />
            <span>{t('matching.mutualMatchBadge') || 'MATCH MUTUEL'}</span>
          </div>
        </div>

        {/* Profile Name & Job */}
        <p className="mt-6 text-base font-extrabold tracking-wide text-white">{profile.name}</p>
        {profileJob && <p className="mt-0.5 text-xs font-semibold text-[#38BDF8]">{profileJob}</p>}
      </motion.div>

      {/* Bottom Action Buttons */}
      <motion.div
        className="mx-auto mt-auto w-full max-w-sm shrink-0 space-y-2 pt-4 pb-2"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <button
          type="button"
          onClick={onViewMatches}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <MessageCircle size={18} />
          <span>{t('matching.sendMessage')}</span>
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-2.5 text-center text-xs font-semibold text-white/70 transition-colors hover:text-white"
        >
          {t('matching.continueExploring')}
        </button>
      </motion.div>
    </motion.div>
  );
}
