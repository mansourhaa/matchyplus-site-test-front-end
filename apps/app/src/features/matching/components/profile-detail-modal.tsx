'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { VideoJSPlayer } from '@/components/video-js-player';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { selectFavorites, toggleFavorite } from '@/features/favorites/store/favorites-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  blockUser,
  fetchMatchState,
  selectMatching,
  unmatchUser,
} from '@/features/matching/store/matching-slice';
import type { FeedProfile } from '@/features/matching/types';
import {
  notifyProfileView,
  rateProfile,
  reportProfile,
} from '@/features/profile/store/profile-slice';
import type { PublicProfile } from '@/features/profile/types';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { api } from '@/lib/api';
import { canStreamOrAutoPlay, useVideoSettings } from '@/lib/video-settings';
import {
  ArrowLeft,
  Award,
  Ban,
  Bookmark,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coffee,
  Flag,
  Globe,
  HeartOff,
  Loader2,
  MapPin,
  MessageCircle,
  MoreVertical,
  Phone,
  Shield,
  ShieldAlert,
  Star,
  Target,
  User,
  Video,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  matched?: boolean;
  viewer_has_rated?: boolean;
};

export type ProfileDetailSource =
  'discovery' | 'search' | 'favorites' | 'history' | 'matches' | 'chat' | 'public';

type Props = {
  profile: ProfileDetailData;
  source?: ProfileDetailSource;
  onClose: () => void;
  onConnect?: () => void;
  onPass?: () => void;
  busy?: boolean;
};

const CONTACT_MODE_ICONS: Record<string, { icon: typeof Video; color: string; bg: string }> = {
  video: { icon: Video, color: '#2F76BB', bg: '#E8F0FA' },
  café: { icon: Coffee, color: '#61BCA6', bg: '#E8F7F3' },
  call: { icon: Phone, color: '#F5A623', bg: '#FFF8EB' },
  phone: { icon: Phone, color: '#F5A623', bg: '#FFF8EB' },
  whatsapp: { icon: MessageCircle, color: '#25D366', bg: '#E8F9F0' },
  person: { icon: Coffee, color: '#61BCA6', bg: '#E8F7F3' },
};

const CONTACT_MODE_TEXT_KEY: Record<string, string> = {
  video: 'video',
  café: 'cafe',
  call: 'call',
  phone: 'call',
  whatsapp: 'whatsapp',
  person: 'person',
};

type ReportReason = 'INAPPROPRIATE' | 'SPAM' | 'FAKE' | 'HARASSMENT' | 'OTHER';

export function ProfileDetailModal({ profile, source, onClose, onConnect, onPass, busy }: Props) {
  const { t, locale, dir } = useI18n();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(selectAuth);

  const [enrichedData, setEnrichedData] = useState<{
    id: string;
    data: Partial<ProfileDetailData>;
  } | null>(null);

  useEffect(() => {
    if (!profile.id) return;
    let active = true;
    try {
      const req = api.get<PublicProfile>(`/profiles/${profile.id}`);
      if (req && typeof req.then === 'function') {
        req
          .then((res) => {
            if (!active || !res?.data) return;
            const p = res.data;
            setEnrichedData({
              id: profile.id,
              data: {
                name: p.name,
                image: p.image,
                video: p.video,
                bio: p.bio,
                job: p.job,
                city: p.city,
                interests: p.interests,
                activity_sector: p.activity_sector,
                service_type: p.service_type,
                profile_type: p.profile_type,
                offer_service: p.offer_service,
                looking_for: p.looking_for,
                experience: p.experience,
                rating: p.rating ?? 0,
                reviews: p.reviews,
                languages: p.languages,
                contact_modes: p.contact_modes,
                price: p.price,
                availability_days: p.availability_days,
                availability_hours: p.availability_hours,
                matched: p.matched,
                viewer_has_rated: p.viewer_has_rated,
              },
            });
          })
          .catch(() => {
            // Keep existing data on network error
          });
      }
    } catch {
      // Ignore synchronous mock/setup error
    }

    return () => {
      active = false;
    };
  }, [profile.id]);

  const currentProfile: ProfileDetailData = useMemo(() => {
    if (enrichedData && enrichedData.id === profile.id) {
      const e = enrichedData.data;
      return {
        ...profile,
        name: e.name || profile.name,
        image: e.image ?? profile.image,
        video: e.video ?? profile.video,
        bio: e.bio ?? profile.bio,
        job: e.job ?? profile.job,
        category: profile.category,
        city: e.city ?? profile.city,
        interests: e.interests && e.interests.length > 0 ? e.interests : profile.interests,
        activity_sector: e.activity_sector ?? profile.activity_sector,
        service_type: e.service_type ?? profile.service_type,
        profile_type: e.profile_type ?? profile.profile_type,
        offer_service: e.offer_service ?? profile.offer_service,
        looking_for: e.looking_for ?? profile.looking_for,
        experience: e.experience ?? profile.experience,
        rating: e.rating !== undefined && e.rating > 0 ? e.rating : profile.rating,
        reviews: e.reviews ?? profile.reviews,
        languages: e.languages && e.languages.length > 0 ? e.languages : profile.languages,
        contact_modes:
          e.contact_modes && e.contact_modes.length > 0 ? e.contact_modes : profile.contact_modes,
        price: e.price ?? profile.price,
        availability_days:
          e.availability_days && e.availability_days.length > 0
            ? e.availability_days
            : profile.availability_days,
        availability_hours:
          e.availability_hours && e.availability_hours.length > 0
            ? e.availability_hours
            : profile.availability_hours,
        matched: e.matched ?? profile.matched,
        viewer_has_rated: e.viewer_has_rated ?? profile.viewer_has_rated,
        distance_km: profile.distance_km ?? e.distance_km,
        match_score: profile.match_score ?? e.match_score,
      };
    }
    return profile;
  }, [profile, enrichedData]);

  const photo = useAuthenticatedMediaUrl(currentProfile.image);
  const video = useAuthenticatedMediaUrl(currentProfile.video, { stream: true });
  const title =
    currentProfile.service_type ||
    currentProfile.job ||
    currentProfile.activity_sector ||
    currentProfile.category ||
    '';
  const notifiedProfileId = useRef<string | null>(null);

  const profileTypeLabel: Record<'INDIVIDUAL' | 'PROVIDER', string> = {
    INDIVIDUAL: t('profileDetail.profileTypeEmployee'),
    PROVIDER: t('profileDetail.profileTypeEmployer'),
  };

  useEffect(() => {
    if (!user || user.id === currentProfile.id) return;
    if (notifiedProfileId.current === currentProfile.id) return;
    notifiedProfileId.current = currentProfile.id;
    void dispatch(notifyProfileView(currentProfile.id));
  }, [dispatch, user, currentProfile.id]);

  const matching = useAppSelector(selectMatching);
  const isMatchedInStore = useMemo(() => {
    return Boolean(
      currentProfile.id && matching?.matches?.some((m) => m.matched_user_id === currentProfile.id),
    );
  }, [currentProfile.id, matching?.matches]);
  const isMatched = Boolean(currentProfile.matched || isMatchedInStore);

  // Rating adapted based on from where the card is opened:
  // - Discovery, Search, and Favorites: only read-only aggregate rating display (no rating box)
  // - Matches, Chat, History (when matched), Public (when matched): interactive rating enabled
  const isRatingAllowedForSource =
    source !== 'discovery' && source !== 'search' && source !== 'favorites';
  const canRateProfile = Boolean(isMatched && isRatingAllowedForSource);

  const { settings: videoSettings } = useVideoSettings();
  const shouldAutoPlay = canStreamOrAutoPlay(videoSettings);
  const { favoriteIds, actionLoading: favActionLoading } = useAppSelector(selectFavorites);
  const isFavorited = Boolean(currentProfile.id && favoriteIds.includes(currentProfile.id));

  // 3-Dots Menu & Modals State
  const [menuOpen, setMenuOpen] = useState(false);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reportAccordionOpen, setReportAccordionOpen] = useState(false);

  const [unmatchLoading, setUnmatchLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason>('INAPPROPRIATE');
  const [reportDetails, setReportDetails] = useState('');

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  // Rating State
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [ratingOutcome, setRatingOutcome] = useState<'saved' | 'already_rated' | 'error' | null>(
    currentProfile.viewer_has_rated ? 'already_rated' : null,
  );
  const [showSavedBanner, setShowSavedBanner] = useState(false);
  const [ratedProfileId, setRatedProfileId] = useState(currentProfile.id);
  const [syncedViewerHasRated, setSyncedViewerHasRated] = useState(currentProfile.viewer_has_rated);

  const displayedProfileIdRef = useRef(currentProfile.id);
  const savedBannerTimeoutRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    displayedProfileIdRef.current = currentProfile.id;
    return () => {
      if (savedBannerTimeoutRef.current !== null) {
        window.clearTimeout(savedBannerTimeoutRef.current);
        savedBannerTimeoutRef.current = null;
      }
    };
  }, [currentProfile.id]);

  if (ratedProfileId !== currentProfile.id) {
    setRatedProfileId(currentProfile.id);
    setSyncedViewerHasRated(currentProfile.viewer_has_rated);
    setSelectedRating(0);
    setIsSavingRating(false);
    setRatingOutcome(currentProfile.viewer_has_rated ? 'already_rated' : null);
    setShowSavedBanner(false);
    setReportAccordionOpen(false);
    setShowUnmatchModal(false);
    setShowBlockModal(false);
    setSelectedReason('INAPPROPRIATE');
    setReportDetails('');
  } else if (currentProfile.viewer_has_rated !== syncedViewerHasRated) {
    setSyncedViewerHasRated(currentProfile.viewer_has_rated);
    if (
      currentProfile.viewer_has_rated &&
      ratingOutcome !== 'saved' &&
      ratingOutcome !== 'already_rated'
    ) {
      setRatingOutcome('already_rated');
    }
  }

  const handleSubmitRating = async () => {
    if (!canRateProfile || isSavingRating || selectedRating < 1) return;

    const targetProfileId = currentProfile.id;
    setIsSavingRating(true);
    const resultAction = await dispatch(
      rateProfile({ userId: targetProfileId, value: selectedRating }),
    );

    if (displayedProfileIdRef.current === targetProfileId) {
      if (rateProfile.fulfilled.match(resultAction)) {
        setRatingOutcome('saved');
        setShowSavedBanner(true);
        if (resultAction.payload) {
          setEnrichedData((prev) => ({
            id: targetProfileId,
            data: {
              ...(prev?.id === targetProfileId ? prev.data : {}),
              rating: resultAction.payload.rating,
              reviews: resultAction.payload.reviews,
              viewer_has_rated: true,
            },
          }));
        }
        if (savedBannerTimeoutRef.current !== null) {
          window.clearTimeout(savedBannerTimeoutRef.current);
        }
        savedBannerTimeoutRef.current = window.setTimeout(() => {
          setShowSavedBanner(false);
          setRatingOutcome('already_rated');
          savedBannerTimeoutRef.current = null;
        }, 2200);
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

  const handleUnmatch = async () => {
    if (!currentProfile.id || unmatchLoading) return;
    setUnmatchLoading(true);
    try {
      await dispatch(unmatchUser(currentProfile.id)).unwrap();
      setShowUnmatchModal(false);
      onClose();
      router.push('/matches');
    } catch {
      // Handled by matching slice
    } finally {
      setUnmatchLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!currentProfile.id || blockLoading) return;
    setBlockLoading(true);
    try {
      await dispatch(blockUser(currentProfile.id)).unwrap();
      setShowBlockModal(false);
      setReportAccordionOpen(false);
      onClose();
      router.push('/matches');
    } catch {
      // Handled by matching slice
    } finally {
      setBlockLoading(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile.id || reportLoading) return;
    setReportLoading(true);
    try {
      await dispatch(
        reportProfile({
          userId: currentProfile.id,
          reason: selectedReason,
          details: reportDetails.trim() || undefined,
        }),
      ).unwrap();

      if (alsoBlock) {
        await dispatch(blockUser(currentProfile.id)).unwrap();
        setReportAccordionOpen(false);
        onClose();
        router.push('/matches');
      } else {
        setReportSubmitted(true);
      }
    } catch {
      // Handled in thunk
    } finally {
      setReportLoading(false);
    }
  };

  const closeReportModal = () => {
    setReportAccordionOpen(false);
    setReportSubmitted(false);
    setReportDetails('');
    setAlsoBlock(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
      dir={dir}
    >
      <article
        className="flex h-[92dvh] max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:h-auto sm:max-h-[88vh] sm:max-w-lg sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('profileDetail.profileAlt', { name: currentProfile.name })}
      >
        {/* Pinned Top Photo Banner Header */}
        <div className="relative h-[42vh] w-full shrink-0 overflow-hidden bg-[#1A1A2E] md:h-[50vh]">
          {video.url ? (
            <video
              src={video.url}
              autoPlay={shouldAutoPlay}
              muted
              loop
              playsInline
              controls
              className="h-full w-full object-cover"
            />
          ) : photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-7xl font-bold text-white/40">
              {currentProfile.name.slice(0, 1)}
            </div>
          )}

          {/* Dark gradient overlay for bottom text contrast */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 left-3.5 z-10 rounded-full bg-black/40 p-2 text-white backdrop-blur-xs transition-opacity hover:opacity-80 active:scale-95"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>

          {/* Top Right Action Buttons: Favorite + 3-Dots */}
          <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (!currentProfile.id) return;
                try {
                  const res = await dispatch(toggleFavorite(currentProfile.id)).unwrap();
                  if (res.favorited) {
                    toast.success(
                      t('profileDetail.addedToFavorites', { name: currentProfile.name }),
                    );
                  } else {
                    toast.success(
                      t('profileDetail.removedFromFavorites', { name: currentProfile.name }),
                    );
                  }
                } catch {
                  toast.error(t('common.errorOccurred') || 'Error');
                }
              }}
              disabled={Boolean(currentProfile.id && favActionLoading[currentProfile.id])}
              aria-label={
                isFavorited
                  ? t('profileDetail.removeFromFavorites')
                  : t('profileDetail.addToFavorites')
              }
              className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-opacity hover:opacity-90 active:scale-95"
            >
              <Bookmark
                size={17}
                color={isFavorited ? '#F5A623' : 'white'}
                fill={isFavorited ? '#F5A623' : 'none'}
              />
            </button>

            {/* 3-Dots Action Menu Trigger Button (only visible when matched: Block, Unmatch, Report) */}
            {isMatched && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-opacity hover:opacity-90 active:scale-95"
                  aria-label={t('chat.options.button')}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical size={18} />
                </button>

                {/* 3-Dots Dropdown Menu */}
                {menuOpen && (
                  <div
                    className="absolute top-full right-0 z-50 mt-2 w-52 rounded-2xl bg-white py-1.5 shadow-2xl ring-1 ring-black/5"
                    style={{ border: '1px solid #EAEAEA' }}
                  >
                    {/* Report Profile */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setReportSubmitted(false);
                        setReportAccordionOpen(true);
                        setTimeout(() => {
                          document
                            .getElementById('report-profile-section')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }, 50);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-[#D97706] transition-colors hover:bg-amber-50"
                    >
                      <Flag size={15} className="text-[#F59E0B]" />
                      {t('chat.options.report')}
                    </button>

                    {/* Unmatch Profile */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowUnmatchModal(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-[#E24E59] transition-colors hover:bg-rose-50"
                    >
                      <HeartOff size={15} className="text-[#E24E59]" />
                      {t('chat.options.unmatch')}
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {/* Block Profile */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowBlockModal(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-[#DC2626] transition-colors hover:bg-rose-50"
                    >
                      <Ban size={15} className="text-[#DC2626]" />
                      {t('chat.options.block')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Banner Overlay: Name, Category/Subtitle and Price Badge */}
          <div className="pointer-events-none absolute right-4 bottom-3.5 left-4 z-10 flex items-end justify-between gap-2">
            <div className="min-w-0 pr-2">
              <h1 className="truncate text-xl font-extrabold text-white drop-shadow-sm sm:text-2xl">
                {currentProfile.name}
              </h1>
              {title && (
                <p className="mt-0.5 truncate text-xs font-medium text-white/90 drop-shadow-xs">
                  {title}
                </p>
              )}
            </div>
            {currentProfile.price && (
              <span className="shrink-0 rounded-full bg-[#2F76BB] px-3.5 py-1.5 text-xs font-bold text-white shadow-md">
                {/(day|jour|j|يوم)/i.test(currentProfile.price)
                  ? currentProfile.price
                  : `${currentProfile.price.replace(/\/(h|hour|hr|heure|ساعة|س)/i, '').trim()} ${t('profileDetail.priceUnit')}`}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Profile Details Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Rating, Experience, City & Distance Info Row */}
          <div className="flex flex-wrap items-center gap-3.5 pt-0.5 pb-0.5 text-xs font-semibold text-[#555]">
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-[#F5A623]" fill="#F5A623" />
              <span className="font-bold text-[#1A1A2E]">
                {Number.isFinite(currentProfile.rating) ? currentProfile.rating.toFixed(1) : '0.0'}{' '}
                {currentProfile.reviews
                  ? t('profileDetail.reviewsCount', { count: currentProfile.reviews })
                  : `(0 ${locale === 'fr' ? 'avis' : locale === 'ar' ? 'تقييم' : 'reviews'})`}
              </span>
            </div>

            {currentProfile.experience && (
              <div className="flex items-center gap-1.5 text-[#555]">
                <Award size={14} color="#2F76BB" />
                <span>
                  {currentProfile.experience} {t('profileDetail.expSuffix')}
                </span>
              </div>
            )}

            {currentProfile.distance_km != null && Number.isFinite(currentProfile.distance_km) && (
              <div className="flex items-center gap-1 text-[#61BCA6]">
                <MapPin size={13} />
                <span>{t('matching.kmAway', { km: currentProfile.distance_km })}</span>
              </div>
            )}
          </div>

          {/* Profile Goals / Service / Bio Card */}
          {(currentProfile.looking_for || currentProfile.offer_service || currentProfile.bio) && (
            <div className="space-y-2 rounded-2xl bg-[#F4F7FB] p-4">
              {currentProfile.looking_for && (
                <div className="flex items-start gap-2 text-xs leading-relaxed text-[#475569]">
                  <span className="mt-0.5 shrink-0 font-bold text-amber-500">🔸</span>
                  <span>{currentProfile.looking_for}</span>
                </div>
              )}
              {currentProfile.bio && (
                <p className="text-xs leading-relaxed whitespace-pre-line text-[#475569] sm:text-[13px]">
                  {currentProfile.bio}
                </p>
              )}
              {currentProfile.offer_service && (
                <div className="flex items-center gap-1.5 pt-0.5 text-xs font-bold text-[#61BCA6]">
                  <Check size={14} strokeWidth={2.5} className="text-[#61BCA6]" />
                  <span>{t('profileDetail.offersService')}</span>
                </div>
              )}
            </div>
          )}

          {/* Rating Section for Mutual Matches (Adapted based on where the card is opened) */}
          {canRateProfile && ratingOutcome !== 'saved' && ratingOutcome !== 'already_rated' && (
            <div
              className="rounded-2xl p-3"
              style={{ background: '#F5F7FA', border: '1px solid #E0E8F0' }}
            >
              <p className="mb-2 text-[13px] font-bold text-[#353535]">
                {t('profileDetail.rateThisProfile')}
              </p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    className="rounded-full p-1"
                    aria-label={
                      star === 1
                        ? t('profileDetail.starRatingSingular', { count: star })
                        : t('profileDetail.starRatingPlural', { count: star })
                    }
                  >
                    <Star
                      size={18}
                      color={star <= selectedRating ? '#F5A623' : '#C8D1DB'}
                      fill={star <= selectedRating ? '#F5A623' : 'none'}
                    />
                  </button>
                ))}
                <span className="ml-1.5 text-xs font-semibold text-[#555]">
                  {selectedRating > 0 ? `${selectedRating}/5` : t('profileDetail.chooseRating')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleSubmitRating()}
                disabled={selectedRating < 1 || isSavingRating}
                className="mt-3.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-95 disabled:opacity-50"
                style={{
                  background:
                    selectedRating < 1 || isSavingRating ? '#CBD5E1' : matchyBrand.gradient,
                }}
              >
                {isSavingRating ? t('profileDetail.savingRating') : t('profileDetail.saveRating')}
              </button>
              {ratingOutcome === 'error' && (
                <p className="mt-2 text-[11px] font-semibold text-[#2F76BB]">
                  {t('profileDetail.ratingError')}
                </p>
              )}
            </div>
          )}

          {canRateProfile && ratingOutcome === 'saved' && showSavedBanner && (
            <div
              className="rounded-2xl p-3"
              style={{ background: '#F5F7FA', border: '1px solid #DCEAD9' }}
            >
              <p className="text-[13px] font-bold text-[#2F6B3D]">
                {t('profileDetail.ratingSavedTitle')}
              </p>
              <p className="mt-1 text-[11px] text-[#5B6E62]">
                {t('profileDetail.ratingSavedDesc')}
              </p>
            </div>
          )}

          {canRateProfile && ratingOutcome === 'already_rated' && (
            <div
              className="rounded-2xl p-3"
              style={{ background: '#F5F7FA', border: '1px solid #E0E8F0' }}
            >
              <p className="flex items-center gap-1 text-[12px] font-semibold text-[#555]">
                <Check size={14} color="#2F76BB" /> {t('profileDetail.alreadyRated')}
              </p>
            </div>
          )}

          {/* Centres d'intérêts */}
          {currentProfile.interests && currentProfile.interests.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-[#353535]">
                {t('profileDetail.interests')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {currentProfile.interests.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#EEF5FF] px-3.5 py-1.5 text-xs font-semibold text-[#2F76BB]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Modes de contact préférés */}
          {currentProfile.contact_modes && currentProfile.contact_modes.length > 0 && (
            <section>
              <p className="mb-2.5 text-sm font-bold text-[#353535]">
                {t('profileDetail.preferredContactModes')}
              </p>
              <div className="space-y-2">
                {currentProfile.contact_modes
                  .filter((mode) => CONTACT_MODE_ICONS[mode])
                  .map((mode) => {
                    const cfg = CONTACT_MODE_ICONS[mode];
                    const textKey = CONTACT_MODE_TEXT_KEY[mode];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={mode}
                        className="flex items-center justify-between rounded-2xl p-3 shadow-2xs transition-all"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.color}35` }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-xs"
                            style={{ background: cfg.color }}
                          >
                            <Icon size={20} color="white" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#1E293B]">
                              {t(`profileDetail.contactModes.${textKey}.label`)}
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                              {t(`profileDetail.contactModes.${textKey}.desc`)}
                            </p>
                          </div>
                        </div>
                        <Check
                          size={18}
                          color={cfg.color}
                          strokeWidth={2.5}
                          className="mr-1 shrink-0"
                        />
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* Langues parlées */}
          {currentProfile.languages && currentProfile.languages.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-[#353535]">
                {t('profileDetail.languages')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {currentProfile.languages.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-full border border-[#DCE8F8] bg-[#EEF5FF] px-3.5 py-1 text-xs font-bold text-[#2F76BB]"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Disponibilités */}
          {(Boolean(currentProfile.availability_days?.length) ||
            Boolean(currentProfile.availability_hours?.length)) && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-[#353535]">
                {t('profileDetail.availableDays') || 'Disponibilités'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {currentProfile.availability_days?.map((day) => (
                  <span
                    key={day}
                    className="rounded-xl bg-[#E8F7F3] px-3 py-1.5 text-xs font-semibold text-[#2A9177]"
                  >
                    {day}
                  </span>
                ))}
                {currentProfile.availability_hours?.map((hour) => (
                  <span
                    key={hour}
                    className="rounded-xl border border-amber-200/60 bg-[#FFF9E6] px-3 py-1.5 text-xs font-semibold text-[#D97706]"
                  >
                    {hour}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Extra Profile Information Card */}
          {(currentProfile.activity_sector || currentProfile.profile_type) && (
            <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid #E8EFF5' }}>
              <div
                className="px-4 py-2.5"
                style={{ background: '#F0F7FF', borderBottom: '1px solid #E8EFF5' }}
              >
                <p className="text-xs font-bold text-[#2F76BB]">
                  {t('profileDetail.profileInformation')}
                </p>
              </div>
              <div className="space-y-2.5 bg-white px-4 py-3">
                {currentProfile.activity_sector && (
                  <div className="flex items-center gap-2.5">
                    <Globe size={14} color="#9B59B6" />
                    <span className="text-[13px] text-[#555]">
                      {currentProfile.activity_sector}
                    </span>
                  </div>
                )}
                {currentProfile.profile_type && (
                  <div className="flex items-center gap-2.5">
                    <User size={14} color="#888" />
                    <span className="text-[13px] text-[#555]">
                      {profileTypeLabel[currentProfile.profile_type]}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signaler ce compte Card — Accordion */}
          <div className="pt-2 pb-1" id="report-profile-section">
            <div className="rounded-2xl border border-rose-200/80 bg-[#FFF5F5] p-2 transition-all">
              {/* Inner White Card */}
              <div className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-2xs">
                {/* Trigger Header */}
                <button
                  type="button"
                  onClick={() => {
                    setReportAccordionOpen((prev: boolean) => !prev);
                    if (reportSubmitted) setReportSubmitted(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-3 transition-all hover:bg-rose-50/40 active:scale-[0.99] ${
                    reportAccordionOpen ? 'border-b border-rose-100' : ''
                  }`}
                  aria-expanded={reportAccordionOpen}
                >
                  <div className="flex items-center gap-2.5">
                    <Shield size={16} className="shrink-0 text-[#DC2626]" />
                    <span className="text-xs font-bold text-[#DC2626]">
                      {t('profileDetail.reportProfile') || 'Signaler ce compte'}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#718096]">
                    {locale === 'fr' ? 'Continuer' : locale === 'ar' ? 'متابعة' : 'Continue'}
                    <ChevronDown
                      size={15}
                      className={`transition-transform duration-200 ${reportAccordionOpen ? 'rotate-180' : ''}`}
                    />
                  </span>
                </button>

                {/* Accordion Content */}
                {reportAccordionOpen && (
                  <div className="p-4">
                    {reportSubmitted ? (
                      /* Post-Report Recommended Actions Screen */
                      <div className="space-y-4">
                        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200/60 bg-emerald-50/80 p-3">
                          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                          <div>
                            <h4 className="text-xs font-bold text-emerald-950">
                              {t('chat.dialogs.postReportTitle')}
                            </h4>
                            <p className="text-xs leading-relaxed font-medium text-emerald-950">
                              {t('chat.dialogs.postReportDesc')}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-bold text-[#1E293B]">
                            {t('chat.dialogs.postReportActionsHeader')}
                          </p>

                          <div className="space-y-2">
                            {/* Action 1: Block User */}
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#1E293B]">
                                  {t('chat.dialogs.blockActionTitle', {
                                    name: currentProfile.name,
                                  })}
                                </p>
                                <p className="mt-0.5 text-[11px] leading-snug text-[#64748B]">
                                  {t('chat.dialogs.blockActionDesc')}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={blockLoading}
                                onClick={handleBlock}
                                className="shrink-0 rounded-xl bg-[#DC2626] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
                              >
                                {blockLoading ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  t('chat.dialogs.blockConfirm')
                                )}
                              </button>
                            </div>

                            {/* Action 2: Unmatch (if matched) */}
                            {isMatched && (
                              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[#1E293B]">
                                    {t('chat.dialogs.unmatchActionTitle', {
                                      name: currentProfile.name,
                                    })}
                                  </p>
                                  <p className="mt-0.5 text-[11px] leading-snug text-[#64748B]">
                                    {t('chat.dialogs.unmatchActionDesc')}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={unmatchLoading}
                                  onClick={handleUnmatch}
                                  className="shrink-0 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-300 disabled:opacity-50"
                                >
                                  {unmatchLoading ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    t('chat.dialogs.unmatchConfirm')
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={closeReportModal}
                          className="w-full rounded-xl bg-[#2F76BB] py-2.5 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-95"
                        >
                          {t('chat.dialogs.doneButton')}
                        </button>
                      </div>
                    ) : (
                      /* Report Reason Form */
                      <form onSubmit={handleReport} className="space-y-3.5">
                        <p className="text-xs font-medium text-[#64748B]">
                          {t('chat.dialogs.reportDesc')}
                        </p>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {(
                            [
                              {
                                key: 'INAPPROPRIATE',
                                label: t('chat.dialogs.reasonInappropriate'),
                              },
                              { key: 'SPAM', label: t('chat.dialogs.reasonSpam') },
                              { key: 'FAKE', label: t('chat.dialogs.reasonFake') },
                              { key: 'HARASSMENT', label: t('chat.dialogs.reasonHarassment') },
                              { key: 'OTHER', label: t('chat.dialogs.reasonOther') },
                            ] as const
                          ).map((option, idx) => (
                            <label
                              key={option.key}
                              className={`flex cursor-pointer items-center gap-2.5 rounded-xl p-2.5 text-xs font-semibold transition-all ${
                                idx === 4 ? 'sm:col-span-2' : ''
                              } ${
                                selectedReason === option.key
                                  ? 'border-2 border-amber-400 bg-amber-50/90 text-amber-950 shadow-2xs'
                                  : 'border border-slate-200/80 bg-slate-50/90 text-slate-700 hover:border-slate-300 hover:bg-white'
                              }`}
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                  selectedReason === option.key
                                    ? 'border-[#DC2626] bg-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {selectedReason === option.key && (
                                  <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
                                )}
                              </span>
                              <input
                                type="radio"
                                name="reportReasonModal"
                                value={option.key}
                                checked={selectedReason === option.key}
                                onChange={() => setSelectedReason(option.key)}
                                className="sr-only"
                              />
                              <span className="leading-tight">{option.label}</span>
                            </label>
                          ))}
                        </div>

                        <div>
                          <textarea
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                            placeholder={t('chat.dialogs.detailsPlaceholder')}
                            rows={3}
                            maxLength={500}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-[#DC2626] focus:outline-hidden"
                          />
                        </div>

                        {/* Inline Block Option */}
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-rose-200/70 bg-rose-50/70 p-2.5">
                          <input
                            type="checkbox"
                            checked={alsoBlock}
                            onChange={(e) => setAlsoBlock(e.target.checked)}
                            className="mt-0.5 rounded accent-[#DC2626]"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-rose-950">
                              {t('chat.dialogs.alsoBlockOption', { name: currentProfile.name })}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-snug text-rose-800/80">
                              {t('chat.dialogs.alsoBlockDesc')}
                            </p>
                          </div>
                        </label>

                        <div className="flex items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            disabled={reportLoading}
                            onClick={closeReportModal}
                            className="flex-1 rounded-xl py-2.5 text-xs font-bold text-[#64748B] transition-colors hover:bg-slate-100"
                            style={{ border: '1px solid #E2E8F0' }}
                          >
                            {t('chat.dialogs.cancel')}
                          </button>
                          <button
                            type="submit"
                            disabled={reportLoading}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] py-2.5 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-95 disabled:opacity-50"
                          >
                            {reportLoading ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              t('chat.dialogs.reportConfirm')
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Chat Link for Mutual Matches */}
          {isMatched && source !== 'chat' && (
            <div className="pt-1">
              <a
                href={`/matches?target=${currentProfile.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white shadow-xs transition-transform hover:scale-[1.01]"
                style={{ background: matchyBrand.gradient }}
              >
                <MessageCircle size={18} />
                {t('profileDetail.sendMessage')}
              </a>
            </div>
          )}
        </div>

        {/* Pinned Bottom Pass / Connect Actions */}
        {(onPass || onConnect) && (
          <div
            className="flex shrink-0 items-center gap-3 bg-white p-4"
            style={{ borderTop: '1px solid #F0F2F5' }}
          >
            {onPass && (
              <button
                type="button"
                disabled={busy}
                onClick={onPass}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] py-3 font-bold text-[#475569] transition-colors hover:bg-[#F8FAFC] active:scale-[0.98] disabled:opacity-60"
              >
                <X size={18} className="text-[#64748B]" strokeWidth={2.5} />
                <span>{busy ? t('matching.swiping') : t('matching.pass')}</span>
              </button>
            )}

            {onConnect && (
              <button
                type="button"
                disabled={busy}
                onClick={onConnect}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] py-3 font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
              >
                <Check size={18} strokeWidth={2.5} className="text-white" />
                <span>{busy ? t('matching.swiping') : t('matching.connect')}</span>
              </button>
            )}
          </div>
        )}
      </article>

      {/* 1. Unmatch Confirmation Modal */}
      {showUnmatchModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-[#E24E59]">
              <HeartOff size={28} />
            </div>
            <h3 className="text-center text-base font-extrabold text-[#1E293B]">
              {t('chat.dialogs.unmatchTitle', { name: profile.name })}
            </h3>
            <p className="mt-2 text-center text-xs leading-relaxed text-[#64748B]">
              {t('chat.dialogs.unmatchDesc', { name: profile.name })}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={unmatchLoading}
                onClick={() => setShowUnmatchModal(false)}
                className="flex-1 rounded-2xl py-2.5 text-xs font-bold text-[#64748B] transition-colors hover:bg-slate-100"
                style={{ border: '1px solid #E2E8F0' }}
              >
                {t('chat.dialogs.cancel')}
              </button>
              <button
                type="button"
                disabled={unmatchLoading}
                onClick={handleUnmatch}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#E24E59] py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {unmatchLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  t('chat.dialogs.unmatchConfirm')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Block Confirmation Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-[#DC2626]">
              <Ban size={28} />
            </div>
            <h3 className="text-center text-base font-extrabold text-[#1E293B]">
              {t('chat.dialogs.blockTitle', { name: profile.name })}
            </h3>
            <p className="mt-2 text-center text-xs leading-relaxed text-[#64748B]">
              {t('chat.dialogs.blockDesc', { name: profile.name })}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={blockLoading}
                onClick={() => setShowBlockModal(false)}
                className="flex-1 rounded-2xl py-2.5 text-xs font-bold text-[#64748B] transition-colors hover:bg-slate-100"
                style={{ border: '1px solid #E2E8F0' }}
              >
                {t('chat.dialogs.cancel')}
              </button>
              <button
                type="button"
                disabled={blockLoading}
                onClick={handleBlock}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#DC2626] py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {blockLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  t('chat.dialogs.blockConfirm')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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

export type MatchingProfileDetail = FeedProfile;
