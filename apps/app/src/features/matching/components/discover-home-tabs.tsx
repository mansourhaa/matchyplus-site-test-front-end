'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { Crown, Heart, Lock, Sparkles } from 'lucide-react';

export type DiscoverHomeMode = 'feed' | 'top';

/**
 * Home tabs (2.0.8): « Fil » | « Meilleurs choix IA » and « M'a aimé », with the plan locks
 * (lock for FREE, crown / heart for Premium) and the sign-up preferences hint.
 */
export function DiscoverHomeTabs({
  homeMode,
  likedMeOnly,
  isPaidPlan,
  showColdStart,
  onModeChange,
  onToggleLikedMe,
}: {
  homeMode: DiscoverHomeMode;
  likedMeOnly: boolean;
  isPaidPlan: boolean;
  showColdStart: boolean;
  onModeChange: (mode: DiscoverHomeMode) => void;
  onToggleLikedMe: () => void;
}) {
  const { t } = useI18n();

  return (
    <div
      data-testid="discover-home-tabs"
      className="mt-4 flex flex-wrap items-center gap-2 text-sm"
    >
      <div role="tablist" className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-100">
        {(['feed', 'top'] as const).map((mode) => {
          const active = homeMode === mode && !likedMeOnly;
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`home-tab-${mode}`}
              onClick={() => onModeChange(mode)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                active ? 'bg-[#2F76BB] text-white' : 'text-gray-600'
              }`}
            >
              {mode === 'top' && (isPaidPlan ? <Crown size={16} /> : <Lock size={14} />)}
              {mode === 'feed' ? t('matching.home.feed') : t('matching.home.topPicks')}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-pressed={likedMeOnly}
        data-testid="home-tab-liked-me"
        onClick={onToggleLikedMe}
        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold shadow-sm transition-colors ${
          likedMeOnly ? 'bg-pink-500 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-100'
        }`}
      >
        {isPaidPlan ? <Heart size={16} /> : <Lock size={14} />}
        {t('matching.home.likedMe')}
      </button>
      {showColdStart && (
        <span data-testid="discover-cold-start" className="flex items-center gap-1.5 text-gray-500">
          <Sparkles size={16} className="text-[#61BCA6]" />
          {t('matching.home.coldStart')}
        </span>
      )}
    </div>
  );
}
