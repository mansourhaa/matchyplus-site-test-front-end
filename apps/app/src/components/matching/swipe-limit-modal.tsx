'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export function SwipeLimitModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full rounded-t-3xl p-6 md:max-w-md md:rounded-3xl"
          style={{ background: 'white' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#E0E0E0] md:hidden" />
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: '#FFF0F0' }}
          >
            <AlertTriangle size={32} color="#E74C3C" />
          </div>
          <p className="text-center text-[20px] font-extrabold text-[#1A1A2E]">
            {t('matching.limitReached')}
          </p>
          <p className="mt-1.5 text-center text-[13px] leading-relaxed text-[#777]">
            {t('matching.limitReachedDesc')}
          </p>
          <p className="mt-2 text-center text-[12px] font-semibold text-[#E67E22]">
            {t('matching.limitReachedHint')}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-2xl py-3.5 text-[15px] font-bold text-white"
            style={{ background: 'linear-gradient(90deg, #61BCA6, #2F76BB)' }}
          >
            {t('matching.continueFree')}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
