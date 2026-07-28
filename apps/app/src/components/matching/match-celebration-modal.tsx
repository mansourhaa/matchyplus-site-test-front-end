'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { FeedProfile } from '@/features/matching/types';
import { motion } from 'framer-motion';

type Props = {
  profile: FeedProfile | { id: string; name: string; image: string | null };
  onContinue: () => void;
  onViewMatches: () => void;
};

export function MatchCelebrationModal({ profile, onContinue, onViewMatches }: Props) {
  const { t } = useI18n();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(10,16,28,0.88)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center"
        initial={{ scale: 0.9, y: 24 }}
        animate={{ scale: 1, y: 0 }}
      >
        <p className="text-4xl">🎉</p>
        <p className="mt-3 text-[22px] font-extrabold text-[#1A1A2E]">{t('matching.itsAMatch')}</p>
        <p className="mt-2 text-[13px] text-[#777]">{t('matching.matchedDesc')}</p>
        <div className="mt-5 flex justify-center">
          <div
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-3xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
          >
            {profile.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.image} alt="" className="h-full w-full object-cover" />
            ) : (
              profile.name.slice(0, 1).toUpperCase()
            )}
          </div>
        </div>
        <p className="mt-3 text-[16px] font-bold text-[#353535]">{profile.name}</p>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onViewMatches}
            className="w-full rounded-2xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: 'linear-gradient(90deg, #61BCA6, #2F76BB)' }}
          >
            {t('matching.sendMessage')}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-2xl border border-[#E5E7EB] py-3.5 text-[15px] font-semibold text-[#353535]"
          >
            {t('matching.continueExploring')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
