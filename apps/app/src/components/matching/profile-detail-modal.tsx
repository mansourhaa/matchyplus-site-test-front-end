'use client';

import { useAppDispatch } from '@/features/auth/hooks';
import { useI18n } from '@/features/i18n/i18n-provider';
import { fetchMatchState } from '@/features/matching/store/matching-slice';
import type { FeedProfile } from '@/features/matching/types';
import { rateProfile, reportProfile } from '@/features/profile/store/profile-slice';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import {
  Award,
  Briefcase,
  Check,
  Clock,
  Coffee,
  Globe,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  Star,
  Target,
  User,
  Video,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

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
  profile_type?: 'INDIVIDUAL' | 'PROVIDER' | null;
  offer_service?: boolean;
  looking_for?: string | null;
  experience?: string | null;
  rating: number;
  reviews?: number | null;
  distance_km?: number | null;
  match_score?: number | null;
  languages?: string[];
  contact_modes?: string[];
  price?: string | null;
  availability_days?: string[];
  availability_hours?: string[];
  // Absent for discovery-feed profiles, which are never matched by definition (a match
  // removes a profile from the feed). The public profile page always sets this from the
  // server's own check — never inferred from the client's possibly-unloaded matches list.
  matched?: boolean;
  // Same reasoning as `matched`: told by the server on GET, so reopening an already-rated
  // profile shows the "already rated" state immediately instead of the picker flashing
  // until a submit attempt bounces off the API.
  viewer_has_rated?: boolean;
};

type Props = {
  profile: ProfileDetailData;
  onClose: () => void;
  onConnect?: () => void;
  onPass?: () => void;
  busy?: boolean;
};

const CONTACT_MODE_CONFIG: Record<
  string,
  { icon: typeof Video; label: string; desc: string; color: string; bg: string }
> = {
  video: {
    icon: Video,
    label: 'Appel Vidéo',
    desc: 'Rencontre en visioconférence',
    color: '#2F76BB',
    bg: '#E8F0FA',
  },
  café: {
    icon: Coffee,
    label: 'Café / Présentiel',
    desc: 'Rencontre dans un lieu public',
    color: '#61BCA6',
    bg: '#E8F7F3',
  },
  call: {
    icon: Phone,
    label: 'Appel Téléphonique',
    desc: 'Échange téléphonique direct',
    color: '#F5A623',
    bg: '#FFF8EB',
  },
  phone: {
    icon: Phone,
    label: 'Appel Téléphonique',
    desc: 'Échange téléphonique direct',
    color: '#F5A623',
    bg: '#FFF8EB',
  },
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp / Chat',
    desc: 'Contacter via WhatsApp',
    color: '#25D366',
    bg: '#E8F9F0',
  },
  person: {
    icon: Coffee,
    label: 'Rencontre en présentiel',
    desc: 'Rencontre en face à face',
    color: '#61BCA6',
    bg: '#E8F7F3',
  },
};

const PROFILE_TYPE_LABEL: Record<'INDIVIDUAL' | 'PROVIDER', string> = {
  INDIVIDUAL: 'Employé',
  PROVIDER: 'Employeur',
};

const REPORT_REASONS = [
  { value: 'fraude', label: 'Fraude' },
  { value: 'fake_profile', label: 'Faux profil' },
  { value: 'harassment', label: 'Harcèlement' },
  { value: 'inappropriate_content', label: 'Contenu inapproprié' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Autre' },
];

export function ProfileDetailModal({ profile, onClose, onConnect, onPass, busy }: Props) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const photo = useAuthenticatedMediaUrl(profile.image);
  const video = useAuthenticatedMediaUrl(profile.video, { stream: true });
  const title =
    profile.service_type || profile.job || profile.activity_sector || profile.category || '';

  const isMatched = Boolean(profile.matched);
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [ratingOutcome, setRatingOutcome] = useState<'saved' | 'already_rated' | 'error' | null>(
    profile.viewer_has_rated ? 'already_rated' : null,
  );
  const [showSavedBanner, setShowSavedBanner] = useState(false);
  const [ratedProfileId, setRatedProfileId] = useState(profile.id);
  const [syncedViewerHasRated, setSyncedViewerHasRated] = useState(profile.viewer_has_rated);

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('fraude');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Lets an in-flight rate/report request tell, after it resolves, whether the component
  // is still displaying the profile it was submitted for — this component's instance can
  // be reused across profiles (e.g. client-side navigation between two /profile/[id]
  // pages), so a slow response for a profile the user has since navigated away from must
  // not overwrite the next profile's state. Kept as a ref, not state: it needs to read as
  // "whatever profile is showing right now" at the moment the response arrives, not the
  // value captured in the async closure when the request was sent.
  const displayedProfileIdRef = useRef(profile.id);
  useLayoutEffect(() => {
    displayedProfileIdRef.current = profile.id;
  }, [profile.id]);

  // Ratings and reports are both one-shot-per-view actions tied to whichever profile is
  // currently displayed, so this local UI state must reset whenever the displayed profile
  // changes — otherwise a stale selection/outcome from a previous profile could carry over
  // if this component's instance is reused across profiles. Adjusted directly during
  // render rather than in an effect, per React's guidance for resetting state when a prop
  // changes — it avoids the extra render pass an effect would cause.
  if (ratedProfileId !== profile.id) {
    setRatedProfileId(profile.id);
    setSyncedViewerHasRated(profile.viewer_has_rated);
    setSelectedRating(0);
    setIsSavingRating(false);
    setRatingOutcome(profile.viewer_has_rated ? 'already_rated' : null);
    setShowSavedBanner(false);
    setShowReportForm(false);
    setReportReason('fraude');
    setReportDetails('');
    setIsReporting(false);
    setReportFeedback(null);
  } else if (profile.viewer_has_rated !== syncedViewerHasRated) {
    // Same profile, but viewer_has_rated changed — e.g. a background refresh of the
    // viewed profile elsewhere in the app, not this component's own submit. The reset
    // above only fires on an id change, so this keeps the picker from lingering once the
    // prop catches up, without waiting for another submit to bounce off already_rated.
    setSyncedViewerHasRated(profile.viewer_has_rated);
    if (
      profile.viewer_has_rated &&
      ratingOutcome !== 'saved' &&
      ratingOutcome !== 'already_rated'
    ) {
      setRatingOutcome('already_rated');
    }
  }

  const handleSubmitRating = async () => {
    if (!isMatched || isSavingRating || selectedRating < 1) return;

    const targetProfileId = profile.id;
    setIsSavingRating(true);
    const resultAction = await dispatch(
      rateProfile({ userId: targetProfileId, value: selectedRating }),
    );

    if (displayedProfileIdRef.current === targetProfileId) {
      if (rateProfile.fulfilled.match(resultAction)) {
        setRatingOutcome('saved');
        setShowSavedBanner(true);
        window.setTimeout(() => setShowSavedBanner(false), 2200);
      } else if (resultAction.error.message === 'already_rated') {
        setRatingOutcome('already_rated');
      } else {
        setRatingOutcome('error');
      }
      setIsSavingRating(false);
    }
    if (rateProfile.fulfilled.match(resultAction)) {
      void dispatch(fetchMatchState());
    }
  };

  const handleSubmitReport = async () => {
    if (isReporting) return;
    const cleanedDetails = reportDetails.trim();
    if (reportReason === 'other' && !cleanedDetails) {
      setReportFeedback({ type: 'error', message: 'Merci de préciser la raison du signalement.' });
      return;
    }

    const targetProfileId = profile.id;
    setIsReporting(true);
    setReportFeedback(null);
    const selectedLabel = REPORT_REASONS.find((entry) => entry.value === reportReason)?.label;
    const resultAction = await dispatch(
      reportProfile({
        userId: targetProfileId,
        reason: reportReason === 'other' ? cleanedDetails : (selectedLabel ?? reportReason),
      }),
    );

    if (displayedProfileIdRef.current === targetProfileId) {
      if (reportProfile.fulfilled.match(resultAction)) {
        setReportFeedback({ type: 'success', message: 'Compte signalé avec succès.' });
        setReportDetails('');
        setShowReportForm(false);
      } else {
        setReportFeedback({
          type: 'error',
          message: 'Impossible de signaler ce compte pour le moment.',
        });
      }
      setIsReporting(false);
    }
  };

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
            <div className="flex items-start justify-between gap-2">
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
              </div>
              {profile.price && (
                <span
                  className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-bold text-white"
                  style={{ background: 'rgba(47,118,187,0.9)' }}
                >
                  {profile.price} DT/h
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs">
              {profile.city && (
                <span className="flex items-center gap-1 text-[#61BCA6]">
                  <MapPin size={13} /> {profile.city}
                </span>
              )}
              {profile.distance_km != null && (
                <span className="text-[#61BCA6]">
                  {t('matching.kmAway', { km: profile.distance_km })}
                </span>
              )}
              {profile.experience && (
                <span className="flex items-center gap-1 text-[#555]">
                  <Award size={14} color="#2F76BB" /> {profile.experience} exp.
                </span>
              )}
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

          {isMatched && ratingOutcome !== 'saved' && ratingOutcome !== 'already_rated' && (
            <div
              className="rounded-2xl p-3"
              style={{ background: '#F5F7FA', border: '1px solid #E0E8F0' }}
            >
              <p className="mb-2 text-[13px] font-bold text-[#353535]">Noter ce profil</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    className="rounded-full p-1"
                    aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      size={18}
                      color={star <= selectedRating ? '#F5A623' : '#C8D1DB'}
                      fill={star <= selectedRating ? '#F5A623' : 'none'}
                    />
                  </button>
                ))}
                <span className="ml-1.5 text-xs font-semibold text-[#555]">
                  {selectedRating > 0 ? `${selectedRating}/5` : 'Choisissez une note'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleSubmitRating()}
                disabled={selectedRating < 1 || isSavingRating}
                className="mt-3 rounded-xl px-4 py-2 text-xs font-bold text-white"
                style={{
                  background:
                    selectedRating < 1 || isSavingRating
                      ? '#A0A0A0'
                      : 'linear-gradient(90deg, #F5A623, #2F76BB)',
                }}
              >
                {isSavingRating ? 'Enregistrement...' : 'Enregistrer la note'}
              </button>
              {ratingOutcome === 'error' && (
                <p className="mt-2 text-[11px] font-semibold text-[#2F76BB]">
                  Impossible d’enregistrer la note.
                </p>
              )}
            </div>
          )}

          {isMatched && ratingOutcome === 'saved' && showSavedBanner && (
            <div
              className="rounded-2xl p-3"
              style={{ background: '#F5F7FA', border: '1px solid #DCEAD9' }}
            >
              <p className="text-[13px] font-bold text-[#2F6B3D]">
                Votre avis a été bien enregistré
              </p>
              <p className="mt-1 text-[11px] text-[#5B6E62]">
                Vous ne pouvez plus noter ce profil.
              </p>
            </div>
          )}

          {isMatched && ratingOutcome === 'already_rated' && (
            <div
              className="rounded-2xl p-3"
              style={{ background: '#F5F7FA', border: '1px solid #DCEAD9' }}
            >
              <p className="text-[13px] font-bold text-[#2F6B3D]">Vous avez déjà noté ce profil.</p>
            </div>
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
            <section>
              <p className="mb-2 text-[13px] font-bold text-[#353535]">Modes de contact préférés</p>
              <div className="space-y-2">
                {profile.contact_modes
                  .filter((mode) => CONTACT_MODE_CONFIG[mode])
                  .map((mode) => {
                    const cfg = CONTACT_MODE_CONFIG[mode];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={mode}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.color}22` }}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: cfg.color }}
                        >
                          <Icon size={18} color="white" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#353535]">{cfg.label}</p>
                          <p className="text-[11px] text-[#777]">{cfg.desc}</p>
                        </div>
                        <div className="ml-auto">
                          <Check size={16} color={cfg.color} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
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

          {(profile.activity_sector ||
            profile.profile_type ||
            profile.looking_for ||
            profile.offer_service) && (
            <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid #E8EFF5' }}>
              <div
                className="px-4 py-2.5"
                style={{ background: '#F0F7FF', borderBottom: '1px solid #E8EFF5' }}
              >
                <p className="text-xs font-bold text-[#2F76BB]">Informations du profil</p>
              </div>
              <div className="space-y-2.5 bg-white px-4 py-3">
                {profile.activity_sector && (
                  <div className="flex items-center gap-2.5">
                    <Globe size={14} color="#9B59B6" />
                    <span className="text-[13px] text-[#555]">{profile.activity_sector}</span>
                  </div>
                )}
                {profile.profile_type && (
                  <div className="flex items-center gap-2.5">
                    <User size={14} color="#888" />
                    <span className="text-[13px] text-[#555]">
                      {PROFILE_TYPE_LABEL[profile.profile_type]}
                    </span>
                  </div>
                )}
                {profile.looking_for && (
                  <div className="flex items-center gap-2.5">
                    <Target size={14} color="#F5A623" />
                    <span className="text-[13px] text-[#555]">{profile.looking_for}</span>
                  </div>
                )}
                {profile.offer_service && (
                  <div className="flex items-center gap-2.5">
                    <Check size={14} color="#61BCA6" />
                    <span className="text-[13px] font-semibold text-[#61BCA6]">
                      Offre un service
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            className="rounded-2xl p-3"
            style={{ background: '#FFF5F7', border: '1px solid #F6CDD3' }}
          >
            <button
              type="button"
              onClick={() => setShowReportForm((value) => !value)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'white', border: '1px solid #F1C8CF' }}
            >
              <Shield size={15} color="#D1445E" />
              <span className="text-[13px] font-extrabold text-[#D1445E]">Signaler ce compte</span>
              <span className="ml-auto text-[11px] font-bold text-[#B35B6A]">
                {showReportForm ? 'Masquer' : 'Continuer'}
              </span>
            </button>
            {showReportForm && (
              <div>
                <p className="mt-2 text-[11px] text-[#8C4A56]">
                  Choisissez un motif. Si vous choisissez Autre, écrivez la raison avec vos propres
                  mots.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {REPORT_REASONS.map((reason) => {
                    const active = reportReason === reason.value;
                    return (
                      <button
                        key={reason.value}
                        type="button"
                        onClick={() => setReportReason(reason.value)}
                        className="rounded-xl px-2 py-2 text-left text-[11px] font-bold"
                        style={{
                          background: active ? '#FFE3E8' : 'white',
                          border: active ? '1.5px solid #D1445E' : '1px solid #EBD3D8',
                          color: active ? '#B9364F' : '#754751',
                        }}
                      >
                        {reason.label}
                      </button>
                    );
                  })}
                </div>
                {reportReason === 'other' ? (
                  <textarea
                    value={reportDetails}
                    onChange={(event) => setReportDetails(event.target.value.slice(0, 500))}
                    placeholder="Décrivez la raison du signalement"
                    className="mt-3 w-full resize-none rounded-xl px-3 py-2.5 text-xs text-[#444] outline-none"
                    style={{ minHeight: 82, background: 'white', border: '1px solid #EBD3D8' }}
                  />
                ) : (
                  <p className="mt-2.5 text-[11px] text-[#8C4A56]">
                    Le signalement sera envoyé directement avec le motif sélectionné.
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-[#9A6973]">
                    {reportReason === 'other' ? `${reportDetails.length}/500` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSubmitReport()}
                    disabled={isReporting}
                    className="rounded-xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{
                      background: 'linear-gradient(90deg, #E24E59, #C43D4A)',
                      opacity: isReporting ? 0.7 : 1,
                    }}
                  >
                    {isReporting ? 'Envoi...' : 'Signaler ce compte'}
                  </button>
                </div>
              </div>
            )}
            {reportFeedback && (
              <p
                className="mt-2.5 text-center text-xs font-bold"
                style={{ color: reportFeedback.type === 'success' ? '#2C8A68' : '#C44D4D' }}
              >
                {reportFeedback.message}
              </p>
            )}
          </div>

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
