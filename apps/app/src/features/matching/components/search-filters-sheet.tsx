'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { DiscoveryFeedSort } from '@/features/matching/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const emptySubscribe = () => () => {};

export type SearchFilters = {
  sector: string | null;
  maxDistanceKm: number;
  minRating: number;
  minPrice: number;
  maxPrice: number | null;
  availableOnly: boolean;
  sort: DiscoveryFeedSort;
};

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  sector: null,
  maxDistanceKm: 25,
  minRating: 0,
  minPrice: 5,
  maxPrice: null,
  availableOnly: false,
  sort: 'distance',
};

const SECTOR_PILLS = [
  'Services & missions',
  'Informatique / Tech',
  'Service à domicile',
  'Chauffeur / Transport',
  'Aide ménagère',
  'Restauration / Hôtellerie',
  'Marketing / Communication',
  'BTP / Artisanat',
];

const RATING_OPTIONS = [
  { value: 0, label: 'Tout' },
  { value: 3, label: '≥3★' },
  { value: 4, label: '≥4★' },
  { value: 4.5, label: '≥4.5★' },
  { value: 4.8, label: '≥4.8★' },
];

export function countActiveSearchFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.sector) count += 1;
  if (filters.maxDistanceKm !== DEFAULT_SEARCH_FILTERS.maxDistanceKm) count += 1;
  if (filters.minRating > 0) count += 1;
  if (filters.minPrice > DEFAULT_SEARCH_FILTERS.minPrice || filters.maxPrice !== null) count += 1;
  if (filters.availableOnly) count += 1;
  if (filters.sort !== DEFAULT_SEARCH_FILTERS.sort) count += 1;
  return count;
}

function formatPriceBadge(minPrice: number, maxPrice: number | null, unlimitedLabel: string) {
  if (minPrice <= 5 && maxPrice === null) return unlimitedLabel;
  if (minPrice > 5 && maxPrice === null) return `≥ ${minPrice} DT`;
  if (minPrice <= 5 && maxPrice !== null) return `≤ ${maxPrice} DT`;
  return `${minPrice} – ${maxPrice} DT`;
}

type SearchFiltersSheetProps = {
  open: boolean;
  draft: SearchFilters;
  onChange: (next: SearchFilters) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
};

export function SearchFiltersSheet({
  open,
  draft,
  onChange,
  onClose,
  onApply,
  onReset,
}: SearchFiltersSheetProps) {
  const { t, dir } = useI18n();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const safeDraft: SearchFilters = {
    sector: draft.sector ?? DEFAULT_SEARCH_FILTERS.sector,
    maxDistanceKm: draft.maxDistanceKm ?? DEFAULT_SEARCH_FILTERS.maxDistanceKm,
    minRating: draft.minRating ?? DEFAULT_SEARCH_FILTERS.minRating,
    minPrice: draft.minPrice ?? DEFAULT_SEARCH_FILTERS.minPrice,
    maxPrice: draft.maxPrice ?? DEFAULT_SEARCH_FILTERS.maxPrice,
    availableOnly: draft.availableOnly ?? DEFAULT_SEARCH_FILTERS.availableOnly,
    sort: draft.sort ?? DEFAULT_SEARCH_FILTERS.sort,
  };

  const sortOptions: { value: DiscoveryFeedSort; label: string }[] = [
    { value: 'distance', label: `📍 ${t('search.sortDistance')}` },
    { value: 'rating', label: `⭐ ${t('search.sortRating')}` },
    { value: 'price_asc', label: `💰 ${t('search.sortPriceAsc')}` },
    { value: 'price_desc', label: `💰 ${t('search.sortPriceDesc')}` },
  ];

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex h-dvh h-screen w-screen flex-col overflow-hidden bg-white"
          style={{ background: '#FFFFFF' }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.2 }}
          dir={dir}
        >
          {/* Top Bar */}
          <div
            className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b bg-white px-5 py-4 sm:px-8"
            style={{ borderBottom: `1px solid ${matchyBrand.border}`, height: 64 }}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8E8E8] bg-white text-[#334155] shadow-2xs transition-colors hover:bg-[#F5F5F5] active:scale-95"
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <p className="text-base font-bold text-[#1A1A2E] sm:text-lg">
                {t('search.customFilters')}
              </p>
            </div>

            <button
              type="button"
              onClick={onReset}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#2F76BB] transition-colors hover:bg-[#F0F7FF] sm:text-sm"
            >
              {t('search.resetFilters')}
            </button>
          </div>

          {/* Scrollable Filters Content */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl space-y-6 px-5 py-6 sm:px-8">
              {/* 1. Secteurs */}
              <div>
                <p className="mb-3 text-sm font-bold" style={{ color: '#1A1A2E' }}>
                  {t('search.sectors')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onChange({ ...safeDraft, sector: null })}
                    className="rounded-2xl px-4 py-2 text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: safeDraft.sector === null ? '#2F76BB' : '#F5F7FA',
                      color: safeDraft.sector === null ? '#FFFFFF' : '#374151',
                      border: safeDraft.sector === null ? '1px solid #2F76BB' : '1px solid #E5E7EB',
                    }}
                  >
                    {t('search.all')}
                  </button>
                  {SECTOR_PILLS.map((sec) => {
                    const isSelected = safeDraft.sector === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() =>
                          onChange({
                            ...safeDraft,
                            sector: isSelected ? null : sec,
                          })
                        }
                        className="rounded-2xl px-4 py-2 text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: isSelected ? '#2F76BB' : '#F5F7FA',
                          color: isSelected ? '#FFFFFF' : '#374151',
                          border: isSelected ? '1px solid #2F76BB' : '1px solid #E5E7EB',
                        }}
                      >
                        {sec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Distance maximale */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold" style={{ color: '#1A1A2E' }}>
                    {t('search.maxDistance')}
                  </p>
                  <span className="rounded-xl bg-[#EBF3FA] px-3 py-1 text-xs font-bold text-[#2F76BB]">
                    {safeDraft.maxDistanceKm} km
                  </span>
                </div>
                {(() => {
                  const distPercent = ((safeDraft.maxDistanceKm - 1) / (25 - 1)) * 100;
                  return (
                    <input
                      type="range"
                      min={1}
                      max={25}
                      step={1}
                      value={safeDraft.maxDistanceKm}
                      onChange={(e) =>
                        onChange({ ...safeDraft, maxDistanceKm: Number(e.target.value) })
                      }
                      style={{
                        background: `linear-gradient(to right, #2F76BB 0%, #2F76BB ${distPercent}%, #E5E7EB ${distPercent}%, #E5E7EB 100%)`,
                      }}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg accent-[#2F76BB]"
                    />
                  );
                })()}
                <div className="mt-1.5 flex justify-between text-xs text-[#9CA3AF]">
                  <span>1 km</span>
                  <span>25 km</span>
                </div>
              </div>

              {/* 3. Note minimale */}
              <div>
                <p className="mb-3 text-sm font-bold" style={{ color: '#1A1A2E' }}>
                  {t('search.minRating')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {RATING_OPTIONS.map((opt) => {
                    const isSelected = safeDraft.minRating === opt.value;
                    const label = opt.value === 0 ? t('search.all') : opt.label;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange({ ...safeDraft, minRating: opt.value })}
                        className="min-w-[54px] flex-1 rounded-2xl py-2 text-center text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: isSelected ? '#2F76BB' : '#F5F7FA',
                          color: isSelected ? '#FFFFFF' : '#374151',
                          border: isSelected ? '1px solid #2F76BB' : '1px solid #E5E7EB',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Prix / jour (Range min - max) */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold" style={{ color: '#1A1A2E' }}>
                    {t('search.priceRange')}
                  </p>
                  <span className="rounded-xl bg-[#EBF3FA] px-3 py-1 text-xs font-bold text-[#2F76BB]">
                    {formatPriceBadge(
                      safeDraft.minPrice,
                      safeDraft.maxPrice,
                      t('search.unlimited'),
                    )}
                  </span>
                </div>
                {(() => {
                  const maxVal = safeDraft.maxPrice ?? 100;
                  const minPercent = ((safeDraft.minPrice - 5) / (100 - 5)) * 100;
                  const maxPercent = ((maxVal - 5) / (100 - 5)) * 100;
                  return (
                    <div className="relative flex h-8 items-center">
                      <div
                        className="pointer-events-none absolute h-2 w-full rounded-lg"
                        style={{
                          background: `linear-gradient(to right, #E5E7EB 0%, #E5E7EB ${minPercent}%, #2F76BB ${minPercent}%, #2F76BB ${maxPercent}%, #E5E7EB ${maxPercent}%, #E5E7EB 100%)`,
                        }}
                      />
                      <input
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={safeDraft.minPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const upper = safeDraft.maxPrice ?? 100;
                          const nextMin = Math.min(val, upper);
                          onChange({ ...safeDraft, minPrice: Math.max(5, nextMin) });
                        }}
                        className="pointer-events-none absolute z-10 h-2 w-full appearance-none bg-transparent accent-[#2F76BB] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#2F76BB] [&::-webkit-slider-thumb]:shadow-md"
                      />
                      <input
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={maxVal}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 100) {
                            onChange({ ...safeDraft, maxPrice: null });
                          } else {
                            onChange({ ...safeDraft, maxPrice: Math.max(val, safeDraft.minPrice) });
                          }
                        }}
                        className="pointer-events-none absolute z-20 h-2 w-full appearance-none bg-transparent accent-[#2F76BB] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#2F76BB] [&::-webkit-slider-thumb]:shadow-md"
                      />
                    </div>
                  );
                })()}
                <div className="mt-1 flex justify-between text-xs text-[#9CA3AF]">
                  <span>5 DT</span>
                  <span>{t('search.unlimited')}</span>
                </div>
              </div>

              {/* 5. Disponibles uniquement */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1A1A2E' }}>
                    {t('search.availableOnly')}
                  </p>
                  <p className="text-xs text-[#6B7280]">{t('search.availableOnlyDesc')}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={safeDraft.availableOnly}
                  onClick={() =>
                    onChange({ ...safeDraft, availableOnly: !safeDraft.availableOnly })
                  }
                  className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                  style={{
                    backgroundColor: safeDraft.availableOnly ? '#2F76BB' : '#E5E7EB',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none mt-0.5 ml-0.5 inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
                    style={{
                      transform: safeDraft.availableOnly ? 'translateX(20px)' : 'translateX(0px)',
                    }}
                  />
                </button>
              </div>

              {/* 6. Trier par */}
              <div>
                <p className="mb-3 text-sm font-bold" style={{ color: '#1A1A2E' }}>
                  {t('search.sortBy')}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {sortOptions.map((opt) => {
                    const isSelected = safeDraft.sort === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange({ ...safeDraft, sort: opt.value })}
                        className="rounded-2xl py-3 text-center text-sm font-semibold transition-all"
                        style={{
                          backgroundColor: isSelected ? '#2F76BB' : '#F9FAFB',
                          color: isSelected ? '#FFFFFF' : '#374151',
                          border: isSelected ? '1px solid #2F76BB' : '1px solid #E5E7EB',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Button */}
          <div
            className="sticky bottom-0 z-20 shrink-0 border-t bg-white px-5 py-4 shadow-lg sm:px-8"
            style={{ borderTop: `1px solid ${matchyBrand.border}` }}
          >
            <div className="mx-auto max-w-2xl">
              <button
                type="button"
                onClick={onApply}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-[0.99]"
                style={{ background: matchyBrand.gradient }}
              >
                <Check size={18} />
                <span>{t('search.applyFilters')}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(content, document.body);
}
