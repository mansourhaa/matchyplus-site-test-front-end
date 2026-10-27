'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import { type DiscoverFeedFilters, MAX_DISTANCE_KM } from '@/features/matching/lib/distance-filter';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
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
  const { locale } = useI18n();
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

  const resultLabel =
    locale === 'ar'
      ? `${resultCount} ملف`
      : locale === 'en'
        ? `${resultCount} ${resultCount === 1 ? 'professional' : 'professionals'}`
        : `${resultCount} ${resultCount === 1 ? 'professionnel' : 'professionnels'}`;

  const presets = [
    { label: locale === 'fr' ? 'Tout' : 'All', km: null },
    { label: '10 km', km: 10 },
    { label: '25 km', km: 25 },
    { label: '50 km', km: 50 },
    { label: '100 km', km: 100 },
    ...(MAX_DISTANCE_KM > 100 ? [{ label: `${MAX_DISTANCE_KM} km`, km: MAX_DISTANCE_KM }] : []),
  ];

  const sheetContent = (
    <AnimatePresence>
      {open && (
        <div
          data-testid="discover-filters-sheet"
          className="fixed inset-0 z-[120] flex flex-col justify-end sm:items-center sm:justify-center"
        >
          {/* Backdrop */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Modal / Bottom Sheet Content */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={locale === 'fr' ? 'Filtres de distance' : 'Distance filters'}
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
          >
            {/* Grab handle for mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <span className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${matchyBrand.blue}15`, color: matchyBrand.blue }}
                >
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {locale === 'fr' ? 'Filtres' : locale === 'ar' ? 'فلاتر' : 'Filters'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {locale === 'fr' ? 'Rayon de recherche' : 'Discovery distance radius'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="discover-filters-reset-btn"
                  onClick={onReset}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                >
                  <RotateCcw size={13} />
                  <span>{locale === 'fr' ? 'Réinitialiser' : 'Reset'}</span>
                </button>
                <button
                  type="button"
                  data-testid="discover-filters-close-btn"
                  onClick={onClose}
                  aria-label="Fermer"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body - Distance Filter Only */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Distance Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="distance-slider" className="text-sm font-semibold text-slate-800">
                    {locale === 'fr' ? 'Rayon de distance' : 'Distance radius'}
                  </label>
                  <span
                    data-testid="discover-filter-distance-value"
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${matchyBrand.blue}15`,
                      color: matchyBrand.blue,
                    }}
                  >
                    {isDistanceUnlimited
                      ? locale === 'fr'
                        ? `Tout (${MAX_DISTANCE_KM} km)`
                        : `Any distance (${MAX_DISTANCE_KM} km)`
                      : `${distanceValue} km`}
                  </span>
                </div>

                <div className="px-1">
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
                      onChange({
                        ...filters,
                        distanceKm: next >= MAX_DISTANCE_KM ? null : next,
                      });
                    }}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#2F76BB]"
                    style={{ accentColor: matchyBrand.blue }}
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                    <span>1 km</span>
                    <span>50 km</span>
                    <span>100 km</span>
                    <span>{MAX_DISTANCE_KM} km (Illimité)</span>
                  </div>
                </div>

                {/* Quick preset buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {presets.map((preset) => {
                    const isSelected =
                      (preset.km === null && isDistanceUnlimited) ||
                      (preset.km !== null && filters.distanceKm === preset.km);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        data-testid={`discover-filter-distance-chip-${preset.km ?? 'all'}`}
                        onClick={() => onChange({ ...filters, distanceKm: preset.km })}
                        className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95"
                        style={{
                          backgroundColor: isSelected ? matchyBrand.blue : '#F8FAFC',
                          color: isSelected ? '#FFFFFF' : '#475569',
                          border: isSelected
                            ? `1px solid ${matchyBrand.blue}`
                            : '1px solid #E2E8F0',
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="border-t border-slate-100 bg-white p-4 shadow-lg">
              <button
                type="button"
                data-testid="discover-filters-apply-btn"
                onClick={onClose}
                className="flex w-full cursor-pointer items-center justify-center rounded-2xl py-3.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-95 active:scale-[0.99]"
                style={{ backgroundColor: matchyBrand.blue }}
              >
                <span>{locale === 'fr' ? `Voir ${resultLabel}` : `View ${resultLabel}`}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(sheetContent, document.body);
}
