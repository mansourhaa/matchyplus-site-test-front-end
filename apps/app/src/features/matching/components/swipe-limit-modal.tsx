'use client';

import { useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import { selectMatching } from '@/features/matching/store/matching-slice';
import type { SwipeQuota } from '@/features/matching/types';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Sparkles, Zap } from 'lucide-react';

export type SwipeLimitModalReason = 'limit' | 'status' | 'locked_profile';

export function SwipeLimitModal({
  onClose,
  quota: propQuota,
  reason = 'limit',
}: {
  onClose: () => void;
  quota?: SwipeQuota | null;
  reason?: SwipeLimitModalReason;
}) {
  const { t } = useI18n();
  const matchingState = useAppSelector(selectMatching);
  const quota = propQuota !== undefined ? propQuota : matchingState.quota;

  const isUnlimited = Boolean(quota?.unlimited);
  const remaining = quota?.remaining ?? 0;
  const limit = quota?.limit ?? 10;
  const isExhausted = !isUnlimited && remaining <= 0;

  // Determine display mode
  const isLockedProfile = reason === 'locked_profile';
  const isStatusView = reason === 'status' && !isExhausted;

  let title = t('matching.limitReached');
  let description = t('matching.limitReachedDesc');
  let icon = <AlertTriangle size={28} color="#DC2626" />;
  let iconBg = '#FEF2F2';

  if (isLockedProfile) {
    title = t('matching.lockedPickTitle');
    description = t('matching.lockedPickDesc');
    icon = <Sparkles size={28} color="#D97706" />;
    iconBg = '#FEF3C7';
  } else if (isStatusView) {
    title = t('matching.quotaTitle');
    description = isUnlimited
      ? t('matching.quotaUnlimitedDesc')
      : t('matching.quotaActiveDesc', { remaining, limit });
    icon = <Zap size={28} color="#D97706" />;
    iconBg = '#FEF3C7';
  }

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
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: iconBg }}
          >
            {icon}
          </div>

          {/* Title */}
          <p className="text-left text-[20px] font-extrabold text-[#1A1A2E]">{title}</p>

          {/* Description */}
          <p className="mt-2 text-left text-[13px] leading-relaxed text-[#64748B]">{description}</p>

          {/* Action button */}
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-slate-100 py-3.5 text-[15px] font-bold text-slate-700 transition-colors hover:bg-slate-200 active:scale-[0.99]"
            >
              {t('matching.continueFree')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
