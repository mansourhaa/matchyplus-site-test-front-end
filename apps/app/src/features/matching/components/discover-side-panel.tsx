'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { DiscoverEmptyPicks } from '@/features/matching/components/discover-empty-feed';
import {
  AIPicksHeader,
  AIRecommendationItem,
  LiveScorePanel,
} from '@/features/matching/components/live-ai-score';
import { formatRole } from '@/features/matching/lib/format-role';
import type { FeedProfile } from '@/features/matching/types';
import { useVideoSettings } from '@/lib/video-settings';

/**
 * Home right column (2.0.8): current profile header, live AI score (details locked for FREE)
 * and the « Meilleurs choix de l'IA » list with its refresh button and plan locks.
 */
export function DiscoverSidePanel({
  profile,
  photoUrl,
  videoUrl,
  isComputing,
  detailsLocked,
  picks,
  isPickLocked,
  refreshing,
  onOpenProfile,
  onLockedPick,
  onUnlockDetails,
  onDismissPick,
  onRefresh,
}: {
  profile: FeedProfile | null;
  photoUrl: string | null | undefined;
  videoUrl: string | null | undefined;
  isComputing: boolean;
  detailsLocked: boolean;
  picks: FeedProfile[];
  isPickLocked: (pick: FeedProfile, rank: number) => boolean;
  refreshing: boolean;
  onOpenProfile: (id: string) => void;
  onLockedPick: () => void;
  onUnlockDetails: () => void;
  onDismissPick: (id: string) => void;
  onRefresh: () => void;
}) {
  const { t } = useI18n();
  const { settings: videoSettings } = useVideoSettings();
  const autoPlay = videoSettings.autoPlay;

  return (
    <>
      {profile ? (
        <div className="space-y-4">
          <div className="relative h-40 overflow-hidden rounded-2xl text-white">
            {videoUrl ? (
              <video
                key={`sidebar-${videoUrl}`}
                src={videoUrl}
                preload="auto"
                autoPlay={autoPlay}
                playsInline
                loop
                muted
                onLoadedData={(e) => {
                  if (autoPlay) {
                    void e.currentTarget.play().catch(() => {});
                  }
                }}
                className="h-full w-full bg-black object-cover"
              />
            ) : photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-3xl font-bold text-white">
                {profile.name.slice(0, 1)}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute start-4 bottom-3">
              <b className="text-lg">{profile.name}</b>
              <p className="text-sm opacity-90">
                {formatRole(profile.service_type || profile.job || profile.category, t)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenProfile(profile.id)}
              className="absolute end-3 bottom-3 rounded-full bg-black/40 px-3 py-1 text-xs font-bold"
            >
              👆 {t('matching.seeDetails')}
            </button>
          </div>
          <LiveScorePanel
            profile={profile}
            isComputing={isComputing}
            detailsLocked={detailsLocked}
            onUnlockDetails={onUnlockDetails}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <AIPicksHeader count={picks.length} refreshing={refreshing} onRefresh={onRefresh} />
      </div>
      <div className="flex-1 space-y-2.5">
        {isComputing ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-2xl bg-white"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : picks.length === 0 ? (
          <DiscoverEmptyPicks />
        ) : (
          picks.map((pick, i) => (
            <AIRecommendationItem
              key={pick.id}
              profile={pick}
              rank={i}
              locked={isPickLocked(pick, i)}
              onDismiss={() => onDismissPick(pick.id)}
              onClick={() => {
                if (isPickLocked(pick, i)) {
                  onLockedPick();
                  return;
                }
                onOpenProfile(pick.id);
              }}
            />
          ))
        )}
      </div>
    </>
  );
}
