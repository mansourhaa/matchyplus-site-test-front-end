'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { DiscoveryFeedSort } from '@/features/matching/types';
import { SERVICE_TYPES } from '@/features/onboarding/constants';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, X } from 'lucide-react';

export type SearchFilters = {
  profileType: 'INDIVIDUAL' | 'PROVIDER' | null;
  serviceTypes: string[];
  minRating: number;
  sort: DiscoveryFeedSort;
};

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  profileType: null,
  serviceTypes: [],
  minRating: 0,
  sort: 'match',
};

export function countActiveSearchFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.profileType) count += 1;
  if (filters.serviceTypes.length > 0) count += 1;
  if (filters.minRating > 0) count += 1;
  if (filters.sort !== DEFAULT_SEARCH_FILTERS.sort) count += 1;
  return count;
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
  const { t } = useI18n();

  const toggleService = (value: string) => {
    const selected = draft.serviceTypes.includes(value)
      ? draft.serviceTypes.filter((item) => item !== value)
      : [...draft.serviceTypes, value];
    onChange({ ...draft, serviceTypes: selected });
  };

  const sortOptions: { value: DiscoveryFeedSort; label: string }[] = [
    { value: 'match', label: t('search.sortMatch') },
    { value: 'distance', label: t('search.sortDistance') },
    { value: 'rating', label: t('search.sortRating') },
  ];

  const profileOptions: { value: SearchFilters['profileType']; label: string }[] = [
    { value: null, label: t('search.profileTypeAll') },
    { value: 'INDIVIDUAL', label: t('search.profileTypeIndividual') },
    { value: 'PROVIDER', label: t('search.profileTypeProvider') },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-white md:max-w-md md:rounded-3xl"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex shrink-0 items-center justify-between px-5 py-4"
              style={{ borderBottom: `1px solid ${matchyBrand.border}` }}
            >
              <p className="text-lg font-extrabold" style={{ color: matchyBrand.textDark }}>
                {t('search.filters')}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: '#F5F7FA' }}
                aria-label={t('common.close')}
              >
                <X size={16} color="#666" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div>
                <p className="mb-3 text-sm font-bold" style={{ color: matchyBrand.textDark }}>
                  {t('search.profileType')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {profileOptions.map((option) => {
                    const selected = draft.profileType === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => onChange({ ...draft, profileType: option.value })}
                        className="rounded-full px-3 py-1.5"
                        style={{
                          fontSize: 13,
                          fontWeight: selected ? 700 : 500,
                          border: selected
                            ? `1.5px solid ${matchyBrand.blue}`
                            : '1px solid #E0E0E0',
                          color: selected ? matchyBrand.blue : '#5C5C5C',
                          background: selected ? matchyBrand.softBlue : 'white',
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-bold" style={{ color: matchyBrand.textDark }}>
                  {t('search.serviceTypes')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPES.map((service) => {
                    const selected = draft.serviceTypes.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className="rounded-full px-3 py-1.5"
                        style={{
                          fontSize: 12,
                          fontWeight: selected ? 700 : 500,
                          border: `1px solid ${matchyBrand.blue}`,
                          color: matchyBrand.blue,
                          background: selected ? 'rgba(47,118,187,0.08)' : 'white',
                        }}
                      >
                        {service}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold" style={{ color: matchyBrand.textDark }}>
                    {t('search.minRating')}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#F5A623]">
                    <Star size={12} fill="#F5A623" color="#F5A623" />
                    {draft.minRating.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={draft.minRating}
                  onChange={(e) => onChange({ ...draft, minRating: Number(e.target.value) })}
                  className="w-full accent-[#F5A623]"
                />
              </div>

              <div>
                <p className="mb-3 text-sm font-bold" style={{ color: matchyBrand.textDark }}>
                  {t('search.sortBy')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => {
                    const selected = draft.sort === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange({ ...draft, sort: option.value })}
                        className="rounded-full px-3 py-1.5"
                        style={{
                          fontSize: 13,
                          fontWeight: selected ? 700 : 500,
                          border: selected
                            ? `1.5px solid ${matchyBrand.teal}`
                            : '1px solid #E0E0E0',
                          color: selected ? matchyBrand.teal : '#5C5C5C',
                          background: selected ? matchyBrand.softTeal : 'white',
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className="flex shrink-0 gap-2 px-5 py-4"
              style={{ borderTop: `1px solid ${matchyBrand.border}` }}
            >
              <button
                type="button"
                onClick={onReset}
                className="flex-1 rounded-2xl py-3.5 text-sm font-bold"
                style={{ background: '#F5F5F5', color: '#555' }}
              >
                {t('search.resetFilters')}
              </button>
              <button
                type="button"
                onClick={onApply}
                className="flex-[1.4] rounded-2xl py-3.5 text-sm font-bold text-white"
                style={{ background: matchyBrand.gradient }}
              >
                {t('search.applyFilters')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
