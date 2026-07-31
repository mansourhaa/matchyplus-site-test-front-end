'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { FeedProfile } from '@/features/matching/types';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { Briefcase, Clock, Globe, MapPin, Phone, Star, X } from 'lucide-react';
import type { ReactNode } from 'react';

export type ProfileDetailData = {
  id: string;
  name: string;
  image: string | null;
  video?: string | null;
  bio: string | null;
  job: string | null;
  category?: string | null;
  city: string | null;
  interests: string[];
  activity_sector?: string | null;
  service_type: string | null;
  rating: number;
  reviews?: number | null;
  distance_km?: number | null;
  match_score?: number | null;
  languages?: string[];
  contact_modes?: string[];
  price?: string | null;
  availability_days?: string[];
  availability_hours?: string[];
};

type Props = {
  profile: ProfileDetailData;
  onClose: () => void;
  onConnect?: () => void;
  onPass?: () => void;
  busy?: boolean;
};

export function ProfileDetailModal({ profile, onClose, onConnect, onPass, busy }: Props) {
  const { t } = useI18n();
  const photo = useAuthenticatedMediaUrl(profile.image);
  const video = useAuthenticatedMediaUrl(profile.video, { stream: true });
  const title =
    profile.service_type || profile.job || profile.activity_sector || profile.category || '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 md:items-center"
      onClick={onClose}
    >
      <article
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white md:max-w-lg md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        aria-label={`Profil de ${profile.name}`}
      >
        <div className="relative h-64 w-full overflow-hidden bg-[#E8EEF5]">
          {photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl font-bold text-[#2F76BB]">
              {profile.name.slice(0, 1)}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 rounded-full bg-black/40 p-2 text-white"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
          {profile.match_score != null && (
            <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#2F76BB]">
              {t('matching.scoreLabel')} {Math.round(profile.match_score)}%
            </span>
          )}
        </div>

        <div className="space-y-4 p-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#1A1A2E]">{profile.name}</h1>
              {profile.rating > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-[#F5A623]">
                  <Star size={13} fill="#F5A623" /> {profile.rating.toFixed(1)}
                  {profile.reviews ? ` (${profile.reviews} avis)` : ''}
                </span>
              )}
            </div>
            {title && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[#777]">
                <Briefcase size={14} /> {title}
              </p>
            )}
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#61BCA6]">
              {profile.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} /> {profile.city}
                </span>
              )}
              {profile.distance_km != null && (
                <span>{t('matching.kmAway', { km: profile.distance_km })}</span>
              )}
              {profile.price && <span>{profile.price} DT/heure</span>}
            </div>
          </div>

          {video.url && (
            <video
              src={video.url}
              controls
              playsInline
              className="aspect-video w-full rounded-2xl bg-black object-cover"
            />
          )}
          {profile.video && video.error && (
            <p className="text-xs text-[#E24E59]">Vidéo inaccessible.</p>
          )}
          {profile.bio && <p className="text-sm leading-relaxed text-[#555]">{profile.bio}</p>}

          {profile.interests.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-[#353535]">Centres d’intérêt</h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#EEF5FF] px-3 py-1 text-xs font-semibold text-[#2F76BB]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}
          {profile.contact_modes && profile.contact_modes.length > 0 && (
            <DetailRow
              icon={<Phone size={15} />}
              title="Modes de contact"
              values={profile.contact_modes}
            />
          )}
          {profile.languages && profile.languages.length > 0 && (
            <DetailRow icon={<Globe size={15} />} title="Langues" values={profile.languages} />
          )}
          {profile.availability_days && profile.availability_days.length > 0 && (
            <DetailRow
              icon={<Clock size={15} />}
              title="Disponibilités"
              values={[...profile.availability_days, ...(profile.availability_hours ?? [])]}
            />
          )}

          {(onPass || onConnect) && (
            <div className="sticky bottom-0 flex gap-3 bg-white pt-2">
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
                  className="flex-1 rounded-2xl bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] py-3 font-bold text-white disabled:opacity-60"
                >
                  {busy ? t('matching.swiping') : t('matching.connect')}
                </button>
              )}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

function DetailRow({ icon, title, values }: { icon: ReactNode; title: string; values: string[] }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#353535]">
        {icon}
        {title}
      </h2>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded-lg bg-[#F5F7FA] px-2.5 py-1 text-xs text-[#555]">
            {value}
          </span>
        ))}
      </div>
    </section>
  );
}

// Keep the discovery call sites type-checked against their richer matching model.
export type MatchingProfileDetail = FeedProfile;
