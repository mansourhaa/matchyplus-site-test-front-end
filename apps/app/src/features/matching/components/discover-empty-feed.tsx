'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

type DiscoverEmptyFeedProps = {
  errorKey?: string | null;
  refreshing?: boolean;
  hasActiveFilters?: boolean;
  onRefresh: () => void;
  onExpandRadius?: () => void;
  onResetFilters?: () => void;
};

export function DiscoverEmptyFeed({
  errorKey,
  refreshing,
  hasActiveFilters,
  onRefresh,
  onExpandRadius,
  onResetFilters,
}: DiscoverEmptyFeedProps) {
  const { t, locale } = useI18n();
  const isError = Boolean(errorKey);

  const text = isError
    ? t('matching.noProfilesErrorHint')
    : hasActiveFilters
      ? locale === 'fr'
        ? "Aucun résultat. Essayez d'augmenter le rayon"
        : locale === 'ar'
          ? 'لا توجد نتائج. حاول زيادة نطاق المسافة'
          : 'No results found. Try expanding your search radius'
      : locale === 'fr'
        ? 'Aucun profil disponible pour le moment.'
        : t('matching.noProfilesTitle');

  const refreshLabel = locale === 'fr' ? 'Actualiser' : t('matching.refreshFeed');
  const expandLabel =
    locale === 'fr'
      ? 'Augmenter le rayon'
      : locale === 'ar'
        ? 'زيادة نطاق المسافة'
        : 'Expand radius';
  const resetLabel =
    locale === 'fr' ? 'Réinitialiser les filtres' : locale === 'ar' ? 'إعادة ضبط' : 'Reset filters';

  return (
    <motion.div
      data-testid="discover-empty-feed"
      className="flex w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <RefreshCw size={22} className={refreshing ? 'animate-spin' : undefined} />
      </div>

      <p className="mb-5 text-[15px] font-medium text-slate-600">{text}</p>

      <div className="flex flex-col items-center gap-2.5 sm:flex-row">
        {onExpandRadius && hasActiveFilters && (
          <button
            type="button"
            data-testid="empty-state-expand-radius-btn"
            onClick={onExpandRadius}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#2F76BB] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-transform hover:opacity-95 active:scale-95"
          >
            <span>{expandLabel}</span>
          </button>
        )}

        {onResetFilters && hasActiveFilters && (
          <button
            type="button"
            data-testid="empty-state-reset-filters-btn"
            onClick={onResetFilters}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-700 transition-transform hover:bg-slate-50 active:scale-95"
          >
            <span>{resetLabel}</span>
          </button>
        )}

        {!hasActiveFilters && (
          <button
            type="button"
            data-testid="empty-state-refresh-btn"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-[#F0F4F8] px-6 py-2.5 text-[14px] font-semibold text-[#2F76BB] transition-transform hover:bg-[#E4EEF8] active:scale-95 disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : undefined} />
            <span>{refreshLabel}</span>
          </button>
        )}
      </div>
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
