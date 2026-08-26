'use client';

import { useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import { selectMatching } from '@/features/matching/store/matching-slice';
import type { SwipeQuota } from '@/features/matching/types';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Sparkles, Zap } from 'lucide-react';

export function SwipeLimitModal({
  onClose,
  quota: propQuota,
}: {
  onClose: () => void;
  quota?: SwipeQuota | null;
}) {
  const { t } = useI18n();
  const matchingState = useAppSelector(selectMatching);
  const quota = propQuota !== undefined ? propQuota : matchingState.quota;

  const isUnlimited = Boolean(quota?.unlimited);
  const remaining = quota?.remaining ?? 0;
  const limit = quota?.limit ?? 10;
  const isExhausted = !isUnlimited && remaining <= 0;

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

          {/* Header Icon */}
          {isExhausted ? (
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: '#FFF0F0' }}
            >
              <AlertTriangle size={32} color="#E74C3C" />
            </div>
          ) : isUnlimited ? (
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: '#E8F8F5' }}
            >
              <Sparkles size={32} color="#61BCA6" />
            </div>
          ) : (
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: '#EBF4FC' }}
            >
              <Zap size={32} color="#2F76BB" />
            </div>
          )}

          {/* Title */}
          <p className="text-center text-[20px] font-extrabold text-[#1A1A2E]">
            {isExhausted
              ? t('matching.limitReached')
              : isUnlimited
                ? t('matching.quotaUnlimited')
                : t('matching.quotaTitle')}
          </p>

          {/* Description */}
          <p className="mt-1.5 text-center text-[13px] leading-relaxed text-[#777]">
            {isExhausted
              ? t('matching.limitReachedDesc')
              : isUnlimited
                ? t('matching.quotaUnlimitedDesc')
                : t('matching.quotaActiveDesc', { remaining, limit })}
          </p>

          {/* Progress bar when limited and has quota */}
          {!isUnlimited && (
            <div
              className="my-4 rounded-xl bg-[#F8FAFC] p-3 text-center"
              style={{ border: '1px solid #EDF2F7' }}
            >
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                <span className="text-[#64748B]">{t('matching.quotaTitle')}</span>
                <span
                  className={isExhausted ? 'font-bold text-rose-600' : 'font-bold text-[#2F76BB]'}
                >
                  {remaining} / {limit}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, (remaining / limit) * 100))}%`,
                    background: isExhausted
                      ? '#E11D48'
                      : 'linear-gradient(90deg, #61BCA6, #2F76BB)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Reset hint */}
          {!isUnlimited && (
            <p className="mt-2 text-center text-[12px] font-semibold text-[#E67E22]">
              {t('matching.limitReachedHint')}
            </p>
          )}

          {/* Action button */}
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl py-3.5 text-[15px] font-bold text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: 'linear-gradient(90deg, #61BCA6, #2F76BB)' }}
            >
              {t('matching.continueFree')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
