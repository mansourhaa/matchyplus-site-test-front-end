'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { motion } from 'framer-motion';
import { MapPin, RefreshCw, RotateCcw } from 'lucide-react';

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
      className="flex w-full max-w-md flex-col items-center justify-center gap-4 px-6 py-20 text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* 2.0.8 empty state: pin in a blue square when filters are active */}
      {hasActiveFilters && !isError ? (
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#E8F1FB] text-[#2F76BB]">
          <MapPin size={32} />
        </span>
      ) : (
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <RefreshCw size={28} className={refreshing ? 'animate-spin' : undefined} />
        </span>
      )}

      <p className="text-lg font-bold text-gray-700">{text}</p>

      <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row">
        {onExpandRadius && hasActiveFilters && (
          <button
            type="button"
            data-testid="empty-state-expand-radius-btn"
            onClick={onExpandRadius}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] px-4 py-3 font-bold text-white transition-transform hover:brightness-105 active:scale-95"
          >
            <MapPin size={16} />
            <span>{expandLabel}</span>
          </button>
        )}

        {onResetFilters && hasActiveFilters && (
          <button
            type="button"
            data-testid="empty-state-reset-filters-btn"
            onClick={onResetFilters}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-600 transition-transform hover:bg-gray-50 active:scale-95"
          >
            <RotateCcw size={16} />
            <span>{resetLabel}</span>
          </button>
        )}

        {!hasActiveFilters && (
          <button
            type="button"
            data-testid="empty-state-refresh-btn"
            onClick={onRefresh}
            disabled={refreshing}
            className="mx-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2F76BB] px-6 py-3 font-bold text-white transition-transform hover:brightness-105 active:scale-95 disabled:opacity-60"
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
