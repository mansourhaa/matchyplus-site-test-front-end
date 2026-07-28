'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { FeedProfile } from '@/features/matching/types';
import { X } from 'lucide-react';

type Props = {
  profile: FeedProfile;
  onClose: () => void;
  onConnect?: () => void;
  onPass?: () => void;
  busy?: boolean;
};

export function ProfileDetailModal({ profile, onClose, onConnect, onPass, busy }: Props) {
  const { t } = useI18n();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white md:max-w-lg md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-56 w-full overflow-hidden bg-[#E8EEF5]">
          {profile.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl font-bold text-[#2F76BB]">
              {profile.name.slice(0, 1)}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-black/40 p-2 text-white"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
          <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#2F76BB]">
            {t('matching.scoreLabel')} {Math.round(profile.match_score)}%
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div>
            <h2 className="text-xl font-extrabold text-[#1A1A2E]">{profile.name}</h2>
            <p className="text-sm text-[#777]">
              {profile.service_type || profile.job || profile.activity_sector || profile.category}
            </p>
            {profile.distance_km != null && (
              <p className="mt-1 text-xs text-[#61BCA6]">
                {t('matching.kmAway', { km: profile.distance_km })}
              </p>
            )}
          </div>

          {profile.bio && <p className="text-sm leading-relaxed text-[#555]">{profile.bio}</p>}

          {profile.interests?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#F0F7F5] px-3 py-1 text-xs font-semibold text-[#2F76BB]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {(onPass || onConnect) && (
            <div className="flex gap-3 pt-2">
              {onPass && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onPass}
                  className="flex-1 rounded-2xl border border-[#E5E7EB] py-3 font-semibold text-[#353535] disabled:opacity-60"
                >
                  {busy ? t('matching.swiping') : t('matching.pass')}
                </button>
              )}
              {onConnect && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onConnect}
                  className="flex-1 rounded-2xl py-3 font-bold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #61BCA6, #2F76BB)' }}
                >
                  {busy ? t('matching.swiping') : t('matching.connect')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
