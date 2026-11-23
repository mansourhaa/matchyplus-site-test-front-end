'use client';

import { useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import { selectMatching } from '@/features/matching/store/matching-slice';
import type { SwipeQuota } from '@/features/matching/types';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Sparkles, Zap } from 'lucide-react';

export type SwipeLimitModalReason = 'limit' | 'status' | 'locked_profile';

const PERK_KEYS = [
  'matching.home.perkActions',
  'matching.home.perkProfiles',
  'matching.home.perkContact',
  'matching.home.perkMessaging',
  'matching.home.perkBoost',
];

/** 2.0.8 « limite du jour » window: big icon, title, text, Premium perks, two buttons. */
export function SwipeLimitModal({
  onClose,
  onUpgrade,
  quota: propQuota,
  reason = 'limit',
}: {
  onClose: () => void;
  /** Opens the plans page; without it only « Continuer gratuitement » is shown. */
  onUpgrade?: () => void;
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
  let icon = <AlertTriangle size={40} />;
  let iconClass = 'bg-red-50 text-red-500';

  if (isLockedProfile) {
    title = t('matching.lockedPickTitle');
    description = t('matching.lockedPickDesc');
    icon = <Sparkles size={40} />;
    iconClass = 'bg-amber-50 text-amber-500';
  } else if (isStatusView) {
    title = t('matching.quotaTitle');
    description = isUnlimited
      ? t('matching.quotaUnlimitedDesc')
      : t('matching.quotaActiveDesc', { remaining, limit });
    icon = <Zap size={40} />;
    iconClass = 'bg-amber-50 text-amber-500';
  }

  const showPerks = !isUnlimited && Boolean(onUpgrade);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-center md:justify-center md:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          data-testid="swipe-limit-modal"
          className="w-full rounded-t-3xl bg-white p-8 text-center shadow-2xl md:max-w-[560px] md:rounded-3xl"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#E0E0E0] md:hidden" />

          <span className={`mx-auto grid h-20 w-20 place-items-center rounded-2xl ${iconClass}`}>
            {icon}
          </span>

          <h3 className="mt-6 text-2xl font-extrabold text-[#1A1A2E]">{title}</h3>
          <p className="mt-3 text-gray-500">{description}</p>

          {showPerks && (
            <ul className="mt-6 space-y-3 text-start text-[#1A1A2E]">
              {PERK_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-2">
                  <Check size={16} className="shrink-0 text-[#61BCA6]" />
                  {t(key)}
                </li>
              ))}
            </ul>
          )}

          {showPerks && (
            <button
              type="button"
              data-testid="swipe-limit-upgrade"
              onClick={() => {
                onClose();
                onUpgrade?.();
              }}
              className="mt-7 w-full rounded-2xl bg-gradient-to-r from-[#5CC4A6] to-[#2F76BB] py-4 text-lg font-bold text-white transition-all hover:brightness-105 active:scale-[0.99]"
            >
              {t('matching.home.goPremium')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`${showPerks ? 'mt-3' : 'mt-7'} w-full rounded-2xl bg-gray-50 py-4 font-semibold text-gray-500 transition-colors hover:bg-gray-100 active:scale-[0.99]`}
          >
            {t('matching.continueFree')}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
