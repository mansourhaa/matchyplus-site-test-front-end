'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

type DiscoverEmptyFeedProps = {
  errorKey?: string | null;
  refreshing?: boolean;
  onRefresh: () => void;
};

export function DiscoverEmptyFeed({ errorKey, refreshing, onRefresh }: DiscoverEmptyFeedProps) {
  const { t, locale } = useI18n();
  const isError = Boolean(errorKey);

  const text = isError
    ? t('matching.noProfilesErrorHint')
    : locale === 'fr'
      ? 'Aucun profil disponible pour le moment.'
      : t('matching.noProfilesTitle');

  const refreshLabel = locale === 'fr' ? 'Actualiser' : t('matching.refreshFeed');

  return (
    <motion.div
      className="flex w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <p className="mb-5 text-[15px] font-medium text-[#64748B]">{text}</p>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-[#F0F4F8] px-6 py-2.5 text-[14px] font-semibold text-[#2F76BB] transition-transform hover:bg-[#E4EEF8] active:scale-95 disabled:opacity-60"
      >
        <RefreshCw size={15} className={refreshing ? 'animate-spin' : undefined} />
        <span>{refreshLabel}</span>
      </button>
    </motion.div>
  );
}

export function DiscoverEmptyPicks() {
  const { t } = useI18n();
  return (
    <div className="py-6 text-center text-xs font-medium text-[#64748B]">
      {t('matching.noPicksTitle')}
    </div>
  );
}
