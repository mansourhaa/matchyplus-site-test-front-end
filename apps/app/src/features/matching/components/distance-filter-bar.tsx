'use client';

import { matchyBrand } from '@/components/matchy/brand';
import {
  DISTANCE_PRESETS,
  MAX_DISTANCE_KM,
  MIN_DISTANCE_KM,
  isCustomDistanceRadius,
} from '@/features/matching/lib/distance-filter';
import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type DistanceFilterBarProps = {
  distanceRadius: number | null;
  onSelectRadius: (radius: number | null, options?: { immediate?: boolean }) => void;
  disabled?: boolean;
  locale?: string;
  debounceMs?: number;
};

export function DistanceFilterBar({
  distanceRadius,
  onSelectRadius,
  disabled = false,
  locale = 'fr',
  debounceMs = 300,
}: DistanceFilterBarProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [prevRadius, setPrevRadius] = useState<number | null>(distanceRadius);
  const [sliderValue, setSliderValue] = useState<number>(distanceRadius ?? MAX_DISTANCE_KM);

  const customButtonRef = useRef<HTMLButtonElement>(null);
  const customPopoverRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize internal slider state during render when prop changes
  if (distanceRadius !== prevRadius) {
    setPrevRadius(distanceRadius);
    setSliderValue(distanceRadius ?? MAX_DISTANCE_KM);
  }

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle click outside and Escape key to close custom popover
  useEffect(() => {
    if (!isCustomOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        customPopoverRef.current &&
        !customPopoverRef.current.contains(target) &&
        customButtonRef.current &&
        !customButtonRef.current.contains(target)
      ) {
        setIsCustomOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCustomOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCustomOpen]);

  const isCustomActive = isCustomDistanceRadius(distanceRadius);

  const handleSliderChange = (newVal: number) => {
    setSliderValue(newVal);
    // Update local and parent UI state immediately
    onSelectRadius(newVal, { immediate: false });

    // Debounce the actual API-triggering dispatch
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onSelectRadius(newVal, { immediate: true });
    }, debounceMs);
  };

  const handleReset = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSliderValue(MAX_DISTANCE_KM);
    onSelectRadius(null, { immediate: true });
  };

  const handlePresetClick = (preset: number | null) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    onSelectRadius(preset, { immediate: true });
  };

  const distPercent = ((sliderValue - MIN_DISTANCE_KM) / (MAX_DISTANCE_KM - MIN_DISTANCE_KM)) * 100;

  const titleText =
    locale === 'ar' ? 'المسافة القصوى' : locale === 'en' ? 'Maximum distance' : 'Distance maximale';

  const resetText = locale === 'ar' ? 'إعادة ضبط' : locale === 'en' ? 'Reset' : 'Réinitialiser';

  const explanationText =
    locale === 'ar'
      ? 'عرض الملفات الشخصية ضمن هذا النطاق.'
      : locale === 'en'
        ? 'Show profiles within this radius.'
        : 'Afficher les profils dans ce rayon.';

  const radiusLabel = locale === 'ar' ? 'النطاق' : locale === 'en' ? 'Radius' : 'Rayon';

  const filterAriaLabel =
    locale === 'ar'
      ? 'تصفية حسب المسافة'
      : locale === 'en'
        ? 'Filter by distance'
        : 'Filtre de distance';

  return (
    <div
      suppressHydrationWarning
      data-testid="distance-filter-row"
      className="relative z-20 mb-2 flex w-full items-center justify-between gap-2 bg-transparent"
    >
      {/* Presets chips row: Tout · 5 km · 10 km · 25 km · 50 km · 100 km */}
      <div
        role="tablist"
        aria-label={filterAriaLabel}
        className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5"
      >
        {DISTANCE_PRESETS.map((preset) => {
          const isSelected = preset === null ? distanceRadius === null : distanceRadius === preset;

          const label =
            preset === null
              ? locale === 'ar'
                ? 'الكل'
                : locale === 'en'
                  ? 'All'
                  : 'Tout'
              : `${preset} km`;

          const testId = preset === null ? 'distance-chip-all' : `distance-chip-${preset}`;

          const tooltip =
            preset === null
              ? locale === 'ar'
                ? 'جميع المسافات'
                : locale === 'en'
                  ? 'All distances'
                  : 'Toutes les distances'
              : locale === 'ar'
                ? `حتى ${preset} كم`
                : locale === 'en'
                  ? `Up to ${preset} km`
                  : `Jusqu'à ${preset} km`;

          return (
            <button
              key={preset ?? 'all'}
              type="button"
              role="tab"
              disabled={disabled}
              aria-selected={isSelected}
              data-testid={testId}
              title={tooltip}
              onClick={() => handlePresetClick(preset)}
              className="shrink-0 cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold shadow-2xs transition-all focus-visible:outline-2 focus-visible:outline-[#2F76BB] active:scale-95 disabled:opacity-50"
              style={{
                backgroundColor: isSelected ? matchyBrand.blue : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#475569',
                border: isSelected ? `1px solid ${matchyBrand.blue}` : '1px solid #E2E8F0',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Custom radius trigger button & anchored popover */}
      <div className="relative shrink-0">
        <button
          type="button"
          ref={customButtonRef}
          disabled={disabled}
          data-testid="distance-custom-toggle"
          onClick={() => setIsCustomOpen((prev) => !prev)}
          aria-expanded={isCustomOpen}
          aria-label={
            locale === 'ar'
              ? 'نطاق المسافة المخصص'
              : locale === 'en'
                ? 'Custom distance radius'
                : 'Rayon de distance personnalisé'
          }
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#2F76BB] active:scale-95 disabled:opacity-50"
          style={{
            backgroundColor: isCustomActive || isCustomOpen ? 'rgba(47, 118, 187, 0.1)' : '#FFFFFF',
            color: isCustomActive || isCustomOpen ? matchyBrand.blue : '#475569',
            border:
              isCustomActive || isCustomOpen
                ? `1px solid ${matchyBrand.blue}`
                : '1px solid #E2E8F0',
          }}
        >
          <SlidersHorizontal size={12} strokeWidth={2} />
          <span>
            {isCustomActive && distanceRadius != null
              ? `${radiusLabel} · ${distanceRadius} km`
              : radiusLabel}
          </span>
        </button>

        {/* Anchored popover */}
        {isCustomOpen && (
          <div
            ref={customPopoverRef}
            data-testid="distance-custom-popover"
            className="absolute top-full right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xl transition-all duration-150 sm:w-80"
          >
            {/* Header: Title and current value */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-[#1A1A2E]">{titleText}</span>
              <span
                data-testid="distance-slider-value"
                className="rounded-xl bg-[#EBF3FA] px-3 py-1 text-xs font-bold text-[#2F76BB]"
              >
                {sliderValue} km
              </span>
            </div>

            {/* Range slider */}
            <input
              type="range"
              min={MIN_DISTANCE_KM}
              max={MAX_DISTANCE_KM}
              step={1}
              value={sliderValue}
              data-testid="distance-slider-input"
              aria-label={titleText}
              aria-valuetext={`${sliderValue} km`}
              onChange={(e) => handleSliderChange(Number.parseInt(e.target.value, 10))}
              style={{
                background: `linear-gradient(to right, #2F76BB 0%, #2F76BB ${distPercent}%, #E5E7EB ${distPercent}%, #E5E7EB 100%)`,
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg accent-[#2F76BB]"
            />

            {/* Scale endpoints */}
            <div className="mt-1.5 flex justify-between text-xs text-[#9CA3AF]">
              <span>{MIN_DISTANCE_KM} km</span>
              <span>{MAX_DISTANCE_KM} km</span>
            </div>

            {/* Concise explanation */}
            <p className="mt-2 text-xs text-slate-500">{explanationText}</p>

            {/* Footer with Reset action */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
              <button
                type="button"
                data-testid="distance-reset-btn"
                onClick={handleReset}
                className="cursor-pointer text-xs font-semibold text-[#2F76BB] hover:underline focus-visible:outline-2 focus-visible:outline-[#2F76BB]"
              >
                {resetText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
