'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { type DiscoverFeedFilters, MAX_DISTANCE_KM } from '@/features/matching/lib/distance-filter';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const emptySubscribe = () => () => {};

export type DiscoverFiltersSheetProps = {
  open: boolean;
  filters: DiscoverFeedFilters;
  resultCount: number;
  onClose: () => void;
  onChange: (filters: DiscoverFeedFilters) => void;
  onReset: () => void;
};

export function DiscoverFiltersSheet({
  open,
  filters,
  resultCount,
  onClose,
  onChange,
  onReset,
}: DiscoverFiltersSheetProps) {
  const { t } = useI18n();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!mounted) return null;

  const distanceValue = filters.distanceKm ?? MAX_DISTANCE_KM;
  const isDistanceUnlimited = filters.distanceKm === null || filters.distanceKm >= MAX_DISTANCE_KM;
  const km = t('matching.home.km');

  const presets = [10, 25, 50, 100, ...(MAX_DISTANCE_KM > 100 ? [MAX_DISTANCE_KM] : [])];
  const midpointKm = Math.round(MAX_DISTANCE_KM / 2);

  const milestoneClass = (active: boolean) =>
    `cursor-pointer transition-colors hover:text-[#2F76BB] ${active ? 'font-semibold text-[#2F76BB]' : ''}`;

  // 2.0.8 « Filtres » window: title + reset + close, distance radius, presets, « Voir N profils ».
  const sheetContent = (
    <AnimatePresence>
      {open && (
        <div
          data-testid="discover-filters-sheet"
          className="fixed inset-0 z-[120] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4"
        >
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('matching.home.filters')}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-[480px] rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#1A1A2E]">
                <SlidersHorizontal size={20} className="text-[#2F76BB]" />
                {t('matching.home.filters')}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-testid="discover-filters-reset-btn"
                  onClick={onReset}
                  className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-[#2F76BB]"
                >
                  <RotateCcw size={14} />
                  {t('matching.home.reset')}
                </button>
                <button
                  type="button"
                  data-testid="discover-filters-close-btn"
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <p className="mt-6 font-bold text-[#1A1A2E]">{t('matching.home.filtersSub')}</p>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
              <label htmlFor="distance-slider" className="flex items-center gap-1.5">
                <MapPin size={16} className="text-[#61BCA6]" />
                {t('matching.home.radius')}
              </label>
              <b
                data-testid="discover-filter-distance-value"
                className="text-lg text-[#2F76BB]"
              >{`${distanceValue} ${km}`}</b>
            </div>

            <input
              id="distance-slider"
              type="range"
              min="1"
              max={MAX_DISTANCE_KM}
              step="1"
              data-testid="discover-filter-distance-slider"
              value={distanceValue}
              onChange={(e) => {
                const next = Number(e.target.value);
                onChange({ ...filters, distanceKm: next >= MAX_DISTANCE_KM ? null : next });
              }}
              className="mt-3 w-full cursor-pointer accent-[#2F76BB]"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <button
                type="button"
                data-testid="discover-filter-milestone-min"
                onClick={() => onChange({ ...filters, distanceKm: 1 })}
                className={milestoneClass(distanceValue === 1)}
              >
                {`1 ${km}`}
              </button>
              <button
                type="button"
                data-testid="discover-filter-milestone-mid"
                onClick={() => onChange({ ...filters, distanceKm: midpointKm })}
                className={milestoneClass(distanceValue === midpointKm)}
              >
                {`${midpointKm} ${km}`}
              </button>
              <button
                type="button"
                data-testid="discover-filter-milestone-max"
                onClick={() => onChange({ ...filters, distanceKm: MAX_DISTANCE_KM })}
                className={milestoneClass(isDistanceUnlimited)}
              >
                {`${MAX_DISTANCE_KM} ${km}`}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {presets.map((preset) => {
                const isSelected =
                  filters.distanceKm === preset ||
                  (preset === MAX_DISTANCE_KM && isDistanceUnlimited);
                return (
                  <button
                    key={preset}
                    type="button"
                    data-testid={`discover-filter-distance-chip-${preset}`}
                    onClick={() => onChange({ ...filters, distanceKm: preset })}
                    className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#2F76BB] text-white'
                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {`${preset} ${km}`}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="discover-filters-apply-btn"
              onClick={onClose}
              className="mt-7 flex h-14 w-full cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] text-lg font-bold text-white transition-all hover:brightness-105 active:scale-[0.99]"
            >
              {t('matching.home.show', { n: resultCount })}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(sheetContent, document.body);
}
