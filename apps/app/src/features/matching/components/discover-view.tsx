'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { MatchyHeaderActions } from '@/components/matchy/matchy-header-actions';
import { VerifiedShield } from '@/components/matchy/verified-shield';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import {
  fetchFavoriteIds,
  selectFavorites,
  toggleFavorite,
} from '@/features/favorites/store/favorites-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  useAutoCaptureGrantedLocation,
  useLocationGate,
} from '@/features/location/location-context';
import {
  DiscoverEmptyFeed,
  DiscoverEmptyPicks,
} from '@/features/matching/components/discover-empty-feed';
import { DiscoverFiltersSheet } from '@/features/matching/components/discover-filters-sheet';
import {
  AIPicksHeader,
  AIRecommendationItem,
  LiveScorePanel,
  matchLevelLabel,
} from '@/features/matching/components/live-ai-score';
import { MatchCelebrationModal } from '@/features/matching/components/match-celebration-modal';
import { ProfileDetailModal } from '@/features/matching/components/profile-detail-modal';
import { SECTOR_PILLS } from '@/features/matching/components/search-filters-sheet';
import { SwipeLimitModal } from '@/features/matching/components/swipe-limit-modal';
import {
  DEFAULT_DISCOVER_FILTERS,
  type DiscoverFeedFilters,
  MAX_DISTANCE_KM,
  readStoredDiscoverFilters,
  storeDiscoverFilters,
} from '@/features/matching/lib/distance-filter';
import { formatRole } from '@/features/matching/lib/format-role';
import {
  clearCelebration,
  clearFeed,
  clearSwipeError,
  closeQuotaModal,
  fetchMatchState,
  fetchQuota,
  fetchSectors,
  fetchSwipeFeed,
  selectMatching,
  selectTopFeedProfile,
  swipeProfile,
} from '@/features/matching/store/matching-slice';
import {
  fetchNotifications,
  selectNotifications,
} from '@/features/notifications/store/notifications-slice';
import { INDUSTRY_KEYS } from '@/features/onboarding/constants';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { useVideoSettings } from '@/lib/video-settings';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import {
  AlertTriangle,
  Baby,
  Bell,
  Bookmark,
  BrainCircuit,
  Briefcase,
  Check,
  ChevronDown,
  Crown,
  Factory,
  Flower2,
  GraduationCap,
  Hammer,
  Heart,
  HeartPulse,
  Landmark,
  Laptop,
  Layers,
  LayoutGrid,
  Loader2,
  Lock,
  MapPin,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Star,
  Store,
  ThumbsDown,
  Truck,
  Utensils,
  Video,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

const emptySubscribe = () => () => {};

export const BASE_SECTOR_VALUES = [
  'Informatique / Tech',
  'BTP / Artisanat',
  'Transport',
  'Ménage',
  'Freelance',
  'Cuisine',
  'Jardinage',
  'Garde enfants',
  'Plomberie',
  'Électricité',
];

export function getSectorIcon(sector: string | null) {
  if (!sector) return <Layers size={14} className="shrink-0" />;
  const s = sector.trim().toLowerCase();
  if (s.includes('tech') || s.includes('informatique'))
    return <Laptop size={14} className="shrink-0" />;
  if (s.includes('btp') || s.includes('artisanat'))
    return <Hammer size={14} className="shrink-0" />;
  if (s.includes('transport') || s.includes('chauffeur'))
    return <Truck size={14} className="shrink-0" />;
  if (s.includes('ménage') || s.includes('menage'))
    return <Sparkles size={14} className="shrink-0" />;
  if (s.includes('freelance')) return <Briefcase size={14} className="shrink-0" />;
  if (s.includes('cuisine') || s.includes('restauration'))
    return <Utensils size={14} className="shrink-0" />;
  if (s.includes('jardinage')) return <Flower2 size={14} className="shrink-0" />;
  if (s.includes('garde') || s.includes('enfant')) return <Baby size={14} className="shrink-0" />;
  if (s.includes('plomberie')) return <Wrench size={14} className="shrink-0" />;
  if (s.includes('électricité') || s.includes('electricite'))
    return <Zap size={14} className="shrink-0" />;
  return <Briefcase size={14} className="shrink-0" />;
}

/** 2.0.8 chips: one emoji per sector (the dropdown keeps the icons). */
export function getSectorEmoji(sector: string): string {
  const s = sector.trim().toLowerCase();
  if (s.includes('tech') || s.includes('informatique')) return '🖥️';
  if (s.includes('btp') || s.includes('artisanat')) return '🧱';
  if (s.includes('transport') || s.includes('chauffeur')) return '🚗';
  if (s.includes('ménage') || s.includes('menage')) return '🧹';
  if (s.includes('freelance')) return '💻';
  if (s.includes('cuisine') || s.includes('restauration')) return '🧑‍🍳';
  if (s.includes('jardinage')) return '🌿';
  if (s.includes('garde') || s.includes('enfant')) return '👶';
  if (s.includes('plomberie')) return '🔧';
  if (s.includes('électricité') || s.includes('electricite')) return '⚡';
  return '💼';
}

/**
 * Feed query of the home tabs/chips: « Meilleurs choix IA » = ranked by AI score (search
 * context of the API), « الكل » = everyone nearest first, « لك » = the personalised feed.
 */
function feedModeParams(mode: 'feed' | 'top', all: boolean) {
  if (mode === 'top') return { context: 'search' as const, sort: 'match' as const };
  return all ? { sort: 'distance' as const } : {};
}

export function DiscoverCardSkeleton() {
  return (
    <div
      data-testid="discover-card-skeleton"
      className="absolute flex animate-pulse flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 shadow-xl"
      style={{
        width: 'min(92%, 440px)',
        height: 'min(90%, 560px)',
        zIndex: 1,
      }}
    >
      <div className="h-60 w-full rounded-2xl bg-slate-200/80" />
      <div className="space-y-3 pt-3">
        <div className="h-6 w-3/4 rounded-md bg-slate-200" />
        <div className="h-4 w-1/2 rounded-md bg-slate-200" />
        <div className="flex gap-2 pt-2">
          <div className="h-7 w-20 rounded-full bg-slate-200" />
          <div className="h-7 w-28 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="flex justify-center gap-6 pt-2">
        <div className="h-14 w-14 rounded-full bg-slate-200" />
        <div className="h-14 w-14 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

/**
 * « القطاع » menu (2.0.8): the 10 onboarding industries, each with its colour and icon. The key
 * (`commerce_retail`…) is what the feed filter sends; the API matches it on `User.industry`.
 */
const INDUSTRY_LOOK: Record<string, { icon: React.ReactNode; from: string; to: string }> = {
  commerce_retail: { icon: <Store size={16} />, from: '#7c3aed', to: '#c084fc' },
  professional_services: { icon: <Briefcase size={16} />, from: '#1e3a8a', to: '#3b82f6' },
  tech_digital: { icon: <Laptop size={16} />, from: '#0f766e', to: '#2dd4bf' },
  finance_insurance: { icon: <Landmark size={16} />, from: '#334155', to: '#64748b' },
  industry_production: { icon: <Factory size={16} />, from: '#78350f', to: '#d97706' },
  agriculture_food: { icon: <Sprout size={16} />, from: '#166534', to: '#4ade80' },
  health_wellness: { icon: <HeartPulse size={16} />, from: '#9d174d', to: '#f472b6' },
  education_training: { icon: <GraduationCap size={16} />, from: '#1d4ed8', to: '#60a5fa' },
  transport_logistics: { icon: <Truck size={16} />, from: '#0c4a6e', to: '#38bdf8' },
  local_services_trades: { icon: <Wrench size={16} />, from: '#1f5f9e', to: '#61bca6' },
};

const isIndustryKey = (sector: string) => (INDUSTRY_KEYS as readonly string[]).includes(sector);

function formatSectorLabel(sector: string, t: (key: string) => string): string {
  if (isIndustryKey(sector)) return t(`onboarding.identity.industries.${sector}`);
  const s = sector.trim().toLowerCase();
  if (s === 'transport') return t('matching.categories.transport');
  if (s === 'ménage' || s === 'menage') return t('matching.categories.cleaning');
  if (s === 'freelance') return t('matching.categories.freelance');
  if (s === 'cuisine') return t('matching.categories.cooking');
  if (s === 'jardinage') return t('matching.categories.gardening');
  if (s === 'garde enfants' || s === "garde d'enfants") return t('matching.categories.childcare');
  if (s === 'plomberie') return t('matching.interestsList.plomberie');
  if (s === 'électricité' || s === 'electricite') return t('matching.interestsList.electricite');
  return formatRole(sector, t) || sector;
}

export function DiscoverView() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { settings: videoSettings } = useVideoSettings();
  const matching = useAppSelector(selectMatching);
  const { unreadCount } = useAppSelector(selectNotifications);
  const { favoriteIds = [], actionLoading: favLoading } = useAppSelector(selectFavorites);
  const feedTop = useAppSelector(selectTopFeedProfile);
  const authUser = useAppSelector((state) => state.auth?.user);
  // Home tabs (2.0.8 design): « Fil », « Meilleurs choix IA » and « M'a aimé », with the
  // 2.0.8 locks. The plan rules stay the API ones: daily swipes, search lock `is_locked`
  // after the plan's profiles, « M'a aimé » for Premium / Premium+ (GET /swipe/who-liked-me).
  const [homeMode, setHomeMode] = useState<'feed' | 'top'>('feed');
  const [likedMeOnly, setLikedMeOnly] = useState(false);
  // « لك » (default) = the personalised feed ranked by AI; « الكل » = everyone, nearest first.
  const [allMode, setAllMode] = useState(false);
  // Swipes done on this visit: the « selon vos préférences d'inscription » hint shows before.
  const [sessionSwipes, setSessionSwipes] = useState(0);
  const userPlan = (matching.quota?.plan ?? authUser?.plan ?? 'FREE').toUpperCase();
  const isPaidPlan = userPlan === 'PREMIUM' || userPlan === 'PREMIUM_PLUS';
  const candidateTop = likedMeOnly
    ? (matching.feed.find((profile) => profile.liked_me) ?? null)
    : feedTop;
  // 2.0.8 « plan lock »: a locked feature or profile shows the Premium card instead of the card.
  const planLock = (likedMeOnly && !isPaidPlan) || Boolean(candidateTop?.is_locked);
  const top = planLock ? null : candidateTop;
  const isTopFavorited = Boolean(top?.id && favoriteIds?.includes(top.id));
  const topPhoto = useAuthenticatedMediaUrl(top?.image);
  const topVideo = useAuthenticatedMediaUrl(top?.video, { stream: true });
  const cardVideoRef = useRef<HTMLVideoElement>(null);
  const [userPausedId, setUserPausedId] = useState<string | null>(null);
  const [userPlayingId, setUserPlayingId] = useState<string | null>(null);
  const [isCardVideoMuted, setIsCardVideoMuted] = useState(true);
  const [isVideoBuffering, setIsVideoBuffering] = useState(false);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);

  const isCardVideoPlaying = Boolean(
    top?.id ? (videoSettings.autoPlay ? userPausedId !== top.id : userPlayingId === top.id) : false,
  );

  const handleToggleCardVideo = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!top?.id) return;
    const video = cardVideoRef.current;
    if (!video) return;

    if (isCardVideoPlaying) {
      setUserPausedId(top.id);
      setUserPlayingId(null);
      video.pause();
    } else {
      setUserPausedId(null);
      setUserPlayingId(top.id);
      void video.play().catch(() => {});
    }
  };
  const {
    latitude,
    longitude,
    locationRequired,
    activating,
    accessMessage,
    requestBrowserLocation,
    locationSynced,
  } = useLocationGate();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProfileId, setDetailProfileId] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);
  const [forceQuotaModal, setForceQuotaModal] = useState(false);
  const [quotaModalReason, setQuotaModalReason] = useState<'limit' | 'status' | 'locked_profile'>(
    'limit',
  );
  const searchParams = useSearchParams();

  const [selectedSector, setSelectedSector] = useState<string | null>(() => {
    const urlSecteur = searchParams?.get('secteur');
    return urlSecteur ?? null;
  });

  const [filters, setFilters] = useState<DiscoverFeedFilters>(() => {
    const stored = readStoredDiscoverFilters();
    const urlKm = searchParams?.get('km');

    const distanceKm = urlKm && /^\d+$/.test(urlKm) ? Number(urlKm) : stored.distanceKm;

    return { distanceKm };
  });

  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const swipedUserIdsRef = useRef<Set<string>>(new Set());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!isSearchOpen) return;
    const updatePosition = () => {
      if (!searchButtonRef.current) return;
      const rect = searchButtonRef.current.getBoundingClientRect();
      const dropdownWidth = Math.min(
        340,
        typeof window !== 'undefined' ? window.innerWidth - 32 : 320,
      );
      let left = rect.left;
      if (typeof window !== 'undefined' && left + dropdownWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - dropdownWidth - 16);
      }
      setDropdownCoords({
        top: rect.bottom ? rect.bottom + 8 : 100,
        left: rect.left ? Math.max(16, left) : 16,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isSearchOpen]);

  const modeParams = (mode: 'feed' | 'top', all: boolean = allMode) => feedModeParams(mode, all);

  const handlePickAll = (all: boolean) => {
    setAllMode(all);
    setSelectedSector(null);
    syncUrlAndStorage(null, filters);
    if (locationSynced && latitude != null && longitude != null) {
      void dispatch(
        fetchSwipeFeed({
          latitude,
          longitude,
          maxDistanceKm: filters.distanceKm ?? undefined,
          ...modeParams(homeMode, all),
        }),
      );
    }
  };

  const handleHomeMode = (mode: 'feed' | 'top') => {
    setLikedMeOnly(false);
    if (mode === homeMode) return;
    setHomeMode(mode);
    if (locationSynced && latitude != null && longitude != null) {
      void dispatch(
        fetchSwipeFeed({
          latitude,
          longitude,
          sector: selectedSector ?? undefined,
          maxDistanceKm: filters.distanceKm ?? undefined,
          ...modeParams(mode),
        }),
      );
    }
  };

  const syncUrlAndStorage = (sector: string | null, currentFilters: DiscoverFeedFilters) => {
    storeDiscoverFilters(currentFilters);
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (sector) url.searchParams.set('secteur', sector);
      else url.searchParams.delete('secteur');

      if (currentFilters.distanceKm !== null && currentFilters.distanceKm < MAX_DISTANCE_KM) {
        url.searchParams.set('km', String(currentFilters.distanceKm));
      } else {
        url.searchParams.delete('km');
      }

      window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
    } catch {
      // URL or history state guard
    }
  };

  useEffect(() => {
    if (!isSearchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        searchButtonRef.current &&
        !searchButtonRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setSearchQuery('');
    }, 0);
    return () => clearTimeout(timer);
  }, [isSearchOpen]);

  useEffect(() => {
    void dispatch(fetchNotifications());
    void dispatch(fetchQuota());
    void dispatch(fetchFavoriteIds());
    void dispatch(fetchSectors());
  }, [dispatch]);

  useAutoCaptureGrantedLocation();

  useEffect(() => {
    if (!locationSynced || latitude == null || longitude == null) {
      dispatch(clearFeed());
      return;
    }
    // Re-fetch when location changes or when feedLoaded is reset (e.g. after withdraw/unmatch).
    if (!matching.feedLoaded) {
      void dispatch(
        fetchSwipeFeed({
          latitude,
          longitude,
          sector: selectedSector ?? undefined,
          maxDistanceKm: filters.distanceKm ?? undefined,
          ...feedModeParams(homeMode, allMode),
        }),
      );
    }
  }, [
    dispatch,
    locationSynced,
    latitude,
    longitude,
    matching.feedLoaded,
    selectedSector,
    filters,
    homeMode,
    allMode,
  ]);

  const handleSelectSector = (sector: string | null) => {
    setSelectedSector(sector);
    syncUrlAndStorage(sector, filters);
    if (locationSynced && latitude != null && longitude != null) {
      void dispatch(
        fetchSwipeFeed({
          latitude,
          longitude,
          sector: sector ?? undefined,
          maxDistanceKm: filters.distanceKm ?? undefined,
          ...modeParams(homeMode),
        }),
      );
    }
  };

  const handleUpdateFilters = (nextFilters: DiscoverFeedFilters) => {
    setFilters(nextFilters);
    syncUrlAndStorage(selectedSector, nextFilters);
    if (locationSynced && latitude != null && longitude != null) {
      void dispatch(
        fetchSwipeFeed({
          latitude,
          longitude,
          sector: selectedSector ?? undefined,
          maxDistanceKm: nextFilters.distanceKm ?? undefined,
          ...modeParams(homeMode),
        }),
      );
    }
  };

  const handleResetAllFilters = () => {
    setAllMode(false);
    setSelectedSector(null);
    setFilters(DEFAULT_DISCOVER_FILTERS);
    syncUrlAndStorage(null, DEFAULT_DISCOVER_FILTERS);
    if (locationSynced && latitude != null && longitude != null) {
      void dispatch(
        fetchSwipeFeed({
          latitude,
          longitude,
          sector: undefined,
          maxDistanceKm: undefined,
          ...modeParams(homeMode, false),
        }),
      );
    }
  };

  const quota = matching.quota;
  const freeRemaining = quota?.remaining;
  const freeLimit = quota?.limit;
  const isRightSwipeBlocked = Boolean(
    quota && !quota.unlimited && quota.remaining != null && quota.remaining <= 0,
  );

  const detailProfile =
    matching.feed.find((p) => p.id === detailProfileId) || (detailOpen && top ? top : null);

  const onPass = async () => {
    if (!top || matching.swipeLoading) return;
    swipedUserIdsRef.current.add(top.id);
    setSessionSwipes((count) => count + 1);
    setSwipeDirection('left');
    try {
      await dispatch(swipeProfile({ targetUserId: top.id, direction: 'left', profile: top }));
    } catch {
      // Errors stored on slice.
    } finally {
      setSwipeDirection(null);
    }
  };

  const onConnect = async () => {
    if (!top || matching.swipeLoading) return;
    if (isRightSwipeBlocked) {
      setQuotaModalReason('limit');
      setForceQuotaModal(true);
      return;
    }
    swipedUserIdsRef.current.add(top.id);
    setSessionSwipes((count) => count + 1);
    setSwipeDirection('right');
    try {
      const result = await dispatch(
        swipeProfile({ targetUserId: top.id, direction: 'right', profile: top }),
      );
      if (swipeProfile.fulfilled.match(result) && result.payload.match) {
        void dispatch(fetchMatchState());
      }
    } catch {
      // Errors stored on slice.
    } finally {
      setSwipeDirection(null);
    }
  };

  const onFavorite = async () => {
    if (!top || Boolean(top.id && favLoading[top.id])) return;
    try {
      const res = await dispatch(toggleFavorite(top.id)).unwrap();
      if (res.favorited) {
        toast.success(
          locale === 'en'
            ? `${top.name} added to favorites ⭐`
            : locale === 'ar'
              ? `تمت إضافة ${top.name} إلى المفضلة ⭐`
              : `${top.name} ajouté aux favoris ⭐`,
        );
      } else {
        toast.success(
          locale === 'en'
            ? `${top.name} removed from favorites`
            : locale === 'ar'
              ? `تمت إزالة ${top.name} من المفضلة`
              : `${top.name} retiré des favoris`,
        );
      }
    } catch {
      toast.error(t('common.errorOccurred') || 'Error');
    }
  };

  const dynamicSectors = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    const add = (val?: string | null) => {
      if (!val || typeof val !== 'string') return;
      const trimmed = val.trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(trimmed);
      }
    };

    // 1. Base sector values (ensures primary sectors are always present)
    for (const s of BASE_SECTOR_VALUES) {
      add(s);
    }

    // 2. Dynamic sectors fetched from database via /v1/discovery/sectors
    const dbSectors = matching.sectors ?? [];
    for (const s of dbSectors) {
      add(s);
    }

    // 3. Dynamic sectors extracted from available feed profiles
    const feedList = matching.feed ?? [];
    for (const p of feedList) {
      add(p.category);
      add(p.activity_sector);
      add(p.service_type);
      add(p.job);
    }

    return result;
  }, [matching.sectors, matching.feed]);

  const visibleSectors = useMemo(() => dynamicSectors.slice(0, 7), [dynamicSectors]);

  const filteredDropdownSectors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const industries: string[] = [...INDUSTRY_KEYS];
    if (!q) return industries;
    return industries.filter((sector) => formatSectorLabel(sector, t).toLowerCase().includes(q));
  }, [searchQuery, t]);

  const isSearchActive = Boolean(selectedSector && !visibleSectors.includes(selectedSector));

  const activeNonSectorFilterCount = useMemo(() => {
    let count = 0;
    if (filters.distanceKm !== null && filters.distanceKm < MAX_DISTANCE_KM) count += 1;
    return count;
  }, [filters]);

  const hasAnyActiveFilter = Boolean(selectedSector || activeNonSectorFilterCount > 0);

  const resultCount = matching.feed.length;
  const showHomeFeedLoader = locationSynced && (matching.feedLoading || !matching.feedLoaded);

  const title = locale === 'fr' ? 'Accueil' : locale === 'ar' ? 'الرئيسية' : t('nav.home');

  const chipClass = (active: boolean) =>
    `flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-[15px] shadow-sm transition-all active:scale-95 ${
      active
        ? 'bg-[#2F76BB] font-bold text-white'
        : 'border border-gray-200 bg-white text-gray-700 hover:bg-slate-50'
    }`;

  const priceLabel = (price: string) =>
    /(day|jour|j|يوم)/i.test(price)
      ? price
      : `${price.replace(/\/(h|hour|hr|heure|ساعة|س)/i, '').trim()} ${t('profileDetail.priceUnit')}`;

  // Right column « Meilleurs choix de l'IA »: 5 suggestions, locked after the 3rd for FREE.
  const visiblePicks = matching.feed
    .filter((p) => p.id !== top?.id && !dismissedSuggestionIds.includes(p.id))
    .slice(0, 5);
  const isPickLocked = (profile: { is_locked?: boolean }, rank: number) =>
    Boolean(profile.is_locked || (!isPaidPlan && rank >= 3));

  const openPlanModal = (reason: 'limit' | 'status' | 'locked_profile') => {
    setQuotaModalReason(reason);
    setForceQuotaModal(true);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      style={{ background: matchyBrand.bg }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Main column — 2.0.8 home: chips, active filters, tabs, card, limit, actions */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8">
          {!locationRequired && (
            <div className="relative z-30 flex flex-col">
              {/* Sector chips + « Secteur » dropdown + « Filtres » (same row, like 2.0.8) */}
              <div
                role="tablist"
                aria-label={t('matching.home.sectors')}
                className="flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedSector === null && allMode}
                  data-testid="sector-pill-all"
                  onClick={() => handlePickAll(true)}
                  className={chipClass(selectedSector === null && allMode)}
                >
                  <span aria-hidden="true">✨</span>
                  <span>{t('matching.home.all')}</span>
                </button>

                <button
                  type="button"
                  ref={searchButtonRef}
                  data-testid="sector-search-toggle"
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  aria-expanded={isSearchOpen}
                  aria-label={t('matching.home.sector')}
                  className={chipClass(isSearchActive)}
                >
                  <LayoutGrid size={16} className="shrink-0" />
                  <span>
                    {isSearchActive && selectedSector
                      ? formatSectorLabel(selectedSector, t)
                      : t('matching.home.sector')}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isSearchOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedSector === null && !allMode}
                  data-testid="sector-pill-for-you"
                  onClick={() => handlePickAll(false)}
                  className={chipClass(selectedSector === null && !allMode)}
                >
                  <Sparkles size={16} className="shrink-0" />
                  <span>{t('matching.home.forYou')}</span>
                </button>

                {visibleSectors.map((sector) => {
                  const isSelected = selectedSector === sector;
                  return (
                    <button
                      key={sector}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      data-testid={`sector-pill-${sector}`}
                      onClick={() => handleSelectSector(isSelected ? null : sector)}
                      className={chipClass(isSelected)}
                    >
                      <span aria-hidden="true">{getSectorEmoji(sector)}</span>
                      <span>{formatSectorLabel(sector, t)}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  data-testid="discover-filters-trigger-btn"
                  onClick={() => setIsFiltersSheetOpen(true)}
                  aria-label={t('matching.home.filters')}
                  className={`flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-[15px] font-semibold shadow-sm transition-all active:scale-95 ${
                    activeNonSectorFilterCount > 0
                      ? 'bg-[#61BCA6] text-white'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal size={16} className="shrink-0" />
                  <span>{t('matching.home.filters')}</span>
                  {activeNonSectorFilterCount > 0 && (
                    <span
                      data-testid="discover-filters-count-badge"
                      className="rounded-full bg-white/25 px-1.5 text-xs"
                    >
                      {activeNonSectorFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Active filters: profile count + removable chips + Reset (only when filtering) */}
              {hasAnyActiveFilter && !matching.feedLoading && (
                <div
                  data-testid="discover-active-filters-bar"
                  className="mt-3 flex flex-wrap items-center gap-2 text-sm"
                >
                  <b data-testid="discover-live-count" className="text-gray-700">
                    {t(resultCount === 1 ? 'matching.home.profileOne' : 'matching.home.profiles', {
                      n: resultCount,
                    })}
                  </b>
                  {selectedSector && (
                    <button
                      type="button"
                      data-testid="active-chip-sector"
                      onClick={() => handleSelectSector(null)}
                      className="flex items-center gap-1.5 rounded-full bg-[#E8F1FB] px-3 py-1 font-semibold text-[#2F76BB]"
                    >
                      {formatSectorLabel(selectedSector, t)}
                      <X size={14} />
                    </button>
                  )}
                  {filters.distanceKm !== null && filters.distanceKm < MAX_DISTANCE_KM && (
                    <button
                      type="button"
                      data-testid="active-chip-distance"
                      onClick={() => handleUpdateFilters({ ...filters, distanceKm: null })}
                      className="flex items-center gap-1.5 rounded-full bg-[#E7F6F2] px-3 py-1 font-semibold text-[#3F9B86]"
                    >
                      <MapPin size={14} />≤ {filters.distanceKm} km
                      <X size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    data-testid="discover-reset-all-btn"
                    onClick={handleResetAllFilters}
                    className="ms-1 flex items-center gap-1 font-semibold text-[#2F76BB]"
                  >
                    <RotateCcw size={14} />
                    {t('matching.home.reset')}
                  </button>
                </div>
              )}

              {/* Tabs: « Fil » | « Meilleurs choix IA » + « M'a aimé » (paid plans only, no lock) */}
              <div
                data-testid="discover-home-tabs"
                className="mt-4 flex flex-wrap items-center gap-2 text-sm"
              >
                <div
                  role="tablist"
                  className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-100"
                >
                  {(['feed', 'top'] as const).map((mode) => {
                    const active = homeMode === mode && !likedMeOnly;
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        data-testid={`home-tab-${mode}`}
                        onClick={() => handleHomeMode(mode)}
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
                  onClick={() => setLikedMeOnly((value) => !value)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold shadow-sm transition-colors ${
                    likedMeOnly
                      ? 'bg-pink-500 text-white'
                      : 'bg-white text-gray-600 ring-1 ring-gray-100'
                  }`}
                >
                  {isPaidPlan ? <Heart size={16} /> : <Lock size={14} />}
                  {t('matching.home.likedMe')}
                </button>
                {homeMode === 'feed' &&
                  !likedMeOnly &&
                  !allMode &&
                  !selectedSector &&
                  sessionSwipes === 0 && (
                    <span
                      data-testid="discover-cold-start"
                      className="flex items-center gap-1.5 text-gray-500"
                    >
                      <Sparkles size={16} className="text-[#61BCA6]" />
                      {t('matching.home.coldStart')}
                    </span>
                  )}
              </div>
            </div>
          )}

          {/* Card */}
          <div className="mt-8 flex flex-col items-center">
            {showHomeFeedLoader ? (
              <div className="relative flex h-[min(620px,72vh)] w-full max-w-[550px] items-center justify-center">
                <DiscoverCardSkeleton />
              </div>
            ) : locationRequired ? null : top ? (
              <div className="relative h-[min(620px,72vh)] min-h-[440px] w-full max-w-[550px]">
                <div className="absolute inset-x-6 -bottom-2 h-full rounded-[22px] bg-gray-200/70" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={top.id}
                    className="absolute inset-0 cursor-grab touch-none overflow-hidden rounded-[22px] text-white shadow-xl select-none active:cursor-grabbing"
                    style={{ zIndex: 1 }}
                    drag={!matching.swipeLoading}
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.7}
                    onDragEnd={(_e, info) => {
                      const offsetX = info.offset.x;
                      const velocityX = info.velocity.x;
                      if (offsetX > 100 || velocityX > 500) {
                        void onConnect();
                      } else if (offsetX < -100 || velocityX < -500) {
                        void onPass();
                      }
                    }}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      x: swipeDirection === 'left' ? -500 : swipeDirection === 'right' ? 500 : 0,
                      y: swipeDirection === 'up' ? -550 : 0,
                      rotate: swipeDirection === 'left' ? -22 : swipeDirection === 'right' ? 22 : 0,
                    }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {topVideo.url ? (
                      <>
                        <video
                          key={topVideo.url}
                          ref={cardVideoRef}
                          src={topVideo.url}
                          preload="auto"
                          autoPlay={isCardVideoPlaying}
                          playsInline
                          loop
                          muted={isCardVideoMuted}
                          onClick={handleToggleCardVideo}
                          onWaiting={() => setIsVideoBuffering(true)}
                          onPlaying={() => setIsVideoBuffering(false)}
                          onPlay={() => {
                            setIsVideoBuffering(false);
                            if (top?.id) {
                              setUserPlayingId(top.id);
                              setUserPausedId(null);
                            }
                          }}
                          onPause={() => {
                            setIsVideoBuffering(false);
                            if (top?.id) {
                              setUserPausedId(top.id);
                              setUserPlayingId(null);
                            }
                          }}
                          onEnded={() => {
                            setIsVideoBuffering(false);
                            if (top?.id) {
                              setUserPausedId(top.id);
                              setUserPlayingId(null);
                            }
                          }}
                          onLoadedData={(e) => {
                            setIsVideoBuffering(false);
                            if (isCardVideoPlaying) {
                              void e.currentTarget.play().catch(() => {});
                            }
                          }}
                          className="absolute inset-0 h-full w-full cursor-pointer bg-black object-cover"
                        />

                        {isVideoBuffering && (
                          <div className="pointer-events-none absolute inset-0 z-25 flex items-center justify-center bg-black/30 backdrop-blur-xs">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 shadow-2xl backdrop-blur-md">
                              <Loader2 className="h-8 w-8 animate-spin text-[#61BCA6]" />
                            </div>
                          </div>
                        )}

                        {!isCardVideoPlaying && !isVideoBuffering && (
                          <button
                            type="button"
                            onClick={handleToggleCardVideo}
                            aria-label={
                              locale === 'en'
                                ? 'Play video'
                                : locale === 'ar'
                                  ? 'تشغيل الفيديو'
                                  : 'Lire la vidéo'
                            }
                            className="pointer-events-auto absolute inset-0 z-20 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                            style={{ border: '2px solid rgba(255,255,255,0.4)' }}
                          >
                            <Play size={28} fill="white" className="ml-1 text-white" />
                          </button>
                        )}
                      </>
                    ) : topPhoto.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={topPhoto.url}
                        alt={top.name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-7xl font-bold text-white">
                        {top.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    {/* Top start: rating, AI score, level, video */}
                    <div className="pointer-events-none absolute start-4 top-4 z-20 flex flex-col items-start gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-bold text-[#1A1A2E] shadow">
                        <Star size={16} color="#F5A623" fill="#F5A623" />
                        {top.reviews || (Number.isFinite(top.rating) && top.rating > 0) ? (
                          <>
                            {top.rating.toFixed(1)}
                            {top.reviews ? (
                              <span className="text-xs font-normal text-gray-400">
                                ({top.reviews})
                              </span>
                            ) : null}
                          </>
                        ) : (
                          t('matching.home.newProfile')
                        )}
                      </span>
                      <span
                        data-testid="discover-card-ai-score"
                        className="flex items-center gap-1.5 rounded-xl bg-black/45 px-3 py-1.5 text-[17px] font-extrabold backdrop-blur"
                      >
                        <BrainCircuit size={16} />
                        {Math.round(top.match_score)}%
                        <span className="text-xs">{t('matching.home.ai')}</span>
                      </span>
                      <span className="rounded-full bg-black/45 px-3 py-0.5 text-xs font-semibold">
                        {matchLevelLabel(top, locale)}
                      </span>
                      {top.video && (
                        <span className="flex items-center gap-1 rounded-full bg-black/45 px-3 py-0.5 text-xs font-semibold">
                          <Video size={14} />
                          {t('matching.home.video')}
                        </span>
                      )}
                    </div>

                    {/* Top end: available, favourite, details, sound */}
                    <div className="pointer-events-auto absolute end-4 top-4 z-20 flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold">
                          ✓ {t('matching.available')}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onFavorite();
                          }}
                          disabled={Boolean(top.id && favLoading[top.id])}
                          aria-label={
                            isTopFavorited
                              ? t('profileDetail.removeFromFavorites')
                              : t('profileDetail.addToFavorites')
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                        >
                          <Bookmark
                            size={16}
                            color={isTopFavorited ? '#F5A623' : 'white'}
                            fill={isTopFavorited ? '#F5A623' : 'none'}
                          />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailProfileId(top.id);
                          setDetailOpen(true);
                        }}
                        className="rounded-full bg-[#2F76BB] px-3 py-1 text-xs font-bold"
                      >
                        👆 {t('matching.seeDetails')}
                      </button>
                      {topVideo.url && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCardVideoMuted((prev) => !prev);
                          }}
                          aria-label={
                            isCardVideoMuted
                              ? t('matching.unmuteVideo') || 'Unmute video'
                              : t('matching.muteVideo') || 'Mute video'
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-all hover:bg-black/70 active:scale-95"
                        >
                          {isCardVideoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                      )}
                    </div>

                    {/* Bottom: name, role, price, distance, bio, tags */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-5">
                      <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="flex items-center gap-1.5 text-[26px] font-extrabold">
                            <span className="truncate">{top.name}</span>
                            {top.verified && (
                              <VerifiedShield
                                size={22}
                                color="#48bba0"
                                className="shrink-0 drop-shadow-sm"
                                aria-label="Verified user"
                              />
                            )}
                          </h2>
                          <p className="text-lg font-semibold opacity-95">
                            {formatRole(top.service_type || top.job || top.category, t)}
                          </p>
                        </div>
                        {top.price && (
                          <span className="shrink-0 rounded-2xl bg-[#2F76BB] px-3 py-2 font-extrabold">
                            {priceLabel(top.price)}
                          </span>
                        )}
                      </div>
                      {((top.distance_km != null && Number.isFinite(top.distance_km)) ||
                        top.city) && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm opacity-90">
                          <MapPin size={16} className="text-[#61BCA6]" />
                          {top.distance_km != null && Number.isFinite(top.distance_km)
                            ? t('matching.kmAway', { km: top.distance_km })
                            : top.city}
                        </p>
                      )}
                      {top.bio && (
                        <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed opacity-95">
                          {top.bio}
                        </p>
                      )}
                      {top.interests?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {top.interests.slice(0, 5).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-[#3F9B86]/90 px-3 py-1 text-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : planLock ? (
              !matching.feedLoading && (
                <div
                  data-testid="discover-plan-lock"
                  className="flex max-w-md flex-col items-center gap-3 py-28 text-center"
                >
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-500">
                    <Crown size={32} />
                  </span>
                  <p className="text-lg font-bold text-[#1A1A2E]">
                    {t('matching.home.premiumOnly')}
                  </p>
                  <button
                    type="button"
                    data-testid="discover-plan-lock-cta"
                    onClick={() => openPlanModal('locked_profile')}
                    className="rounded-xl bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] px-5 py-2.5 font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
                  >
                    {t('matching.home.goPremium')}
                  </button>
                </div>
              )
            ) : likedMeOnly ? (
              !matching.feedLoading && (
                <div
                  data-testid="discover-liked-me-empty"
                  className="flex max-w-md flex-col items-center gap-3 py-24 text-center"
                >
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-pink-50 text-pink-500">
                    <Heart size={30} />
                  </span>
                  <p className="text-[15px] font-semibold text-gray-600">
                    {t('matching.home.likedMeEmpty')}
                  </p>
                </div>
              )
            ) : (
              !matching.feedLoading && (
                <div className="flex w-full justify-center">
                  <DiscoverEmptyFeed
                    errorKey={matching.feedError}
                    refreshing={matching.feedLoading}
                    hasActiveFilters={hasAnyActiveFilter}
                    onRefresh={() =>
                      void dispatch(
                        fetchSwipeFeed(
                          latitude != null && longitude != null
                            ? {
                                latitude,
                                longitude,
                                sector: selectedSector ?? undefined,
                                maxDistanceKm: filters.distanceKm ?? undefined,
                                ...modeParams(homeMode),
                              }
                            : undefined,
                        ),
                      )
                    }
                    onExpandRadius={() => handleUpdateFilters({ ...filters, distanceKm: null })}
                    onResetFilters={handleResetAllFilters}
                  />
                </div>
              )
            )}

            {/* Daily limit + actions (2.0.8) */}
            {top && !locationRequired && (
              <>
                {matching.swipeError && (
                  <div className="mt-6 flex w-full max-w-[380px] items-center justify-between rounded-xl bg-[#FFF0F0] px-3 py-2 text-xs text-[#E74C3C]">
                    <span>{t(matching.swipeError)}</span>
                    <button type="button" onClick={() => dispatch(clearSwipeError())}>
                      {t('common.close')}
                    </button>
                  </div>
                )}

                {quota?.unlimited ? (
                  <div
                    data-testid="discover-unlimited-pill"
                    className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-[15px] font-semibold text-amber-700"
                  >
                    ⭐ {t('matching.home.unlimited')}
                  </div>
                ) : quota ? (
                  <div
                    data-testid="discover-quota-banner"
                    className="mt-8 flex items-center gap-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-2.5 text-[15px]"
                  >
                    <span className="flex items-center gap-2 font-semibold text-red-600">
                      <AlertTriangle size={16} />
                      {t('matching.swipeQuotaActionsRemaining', {
                        remaining: freeRemaining ?? 0,
                        limit: freeLimit ?? 10,
                      })}
                    </span>
                    <button
                      type="button"
                      data-testid="discover-go-premium"
                      onClick={() => openPlanModal(freeRemaining === 0 ? 'limit' : 'status')}
                      className="font-bold text-[#2F76BB]"
                    >
                      {t('matching.home.goPremium')}
                    </button>
                  </div>
                ) : null}

                <div className="mt-4 flex gap-5">
                  <button
                    type="button"
                    onClick={() => void onPass()}
                    disabled={!top || matching.swipeLoading}
                    className="flex w-44 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-4 text-lg font-bold whitespace-nowrap text-gray-600 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60"
                  >
                    <X size={20} />
                    <span>{t('matching.pass')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onConnect()}
                    disabled={!top || matching.swipeLoading || isRightSwipeBlocked}
                    className={`flex w-44 items-center justify-center gap-2 rounded-2xl py-4 text-lg font-bold whitespace-nowrap text-white shadow-sm transition-all active:scale-[0.98] ${
                      isRightSwipeBlocked
                        ? 'cursor-not-allowed bg-gray-200 text-white/80'
                        : 'bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] hover:brightness-105'
                    }`}
                  >
                    <Check size={20} />
                    <span>{t('matching.connect')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right column (2.0.8): current profile, AI score, AI picks */}
        <div
          className="hidden flex-none flex-col gap-4 overflow-y-auto px-4 py-6 lg:flex"
          style={{ width: 360, background: matchyBrand.bg }}
        >
          {locationRequired || !locationSynced ? null : (
            <>
              {top ? (
                <div className="space-y-4">
                  <div className="relative h-40 overflow-hidden rounded-2xl text-white">
                    {topVideo.url ? (
                      <video
                        key={`sidebar-${topVideo.url}`}
                        src={topVideo.url}
                        preload="auto"
                        autoPlay={videoSettings.autoPlay}
                        playsInline
                        loop
                        muted
                        onLoadedData={(e) => {
                          if (videoSettings.autoPlay) {
                            void e.currentTarget.play().catch(() => {});
                          }
                        }}
                        className="h-full w-full bg-black object-cover"
                      />
                    ) : topPhoto.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={topPhoto.url}
                        alt={top.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-3xl font-bold text-white">
                        {top.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute start-4 bottom-3">
                      <b className="text-lg">{top.name}</b>
                      <p className="text-sm opacity-90">
                        {formatRole(top.service_type || top.job || top.category, t)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailProfileId(top.id);
                        setDetailOpen(true);
                      }}
                      className="absolute end-3 bottom-3 rounded-full bg-black/40 px-3 py-1 text-xs font-bold"
                    >
                      👆 {t('matching.seeDetails')}
                    </button>
                  </div>
                  <LiveScorePanel
                    profile={top}
                    isComputing={matching.feedLoading && !matching.feedLoaded}
                    detailsLocked={!isPaidPlan}
                    onUnlockDetails={() => openPlanModal('status')}
                  />
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <AIPicksHeader
                  count={visiblePicks.length}
                  refreshing={matching.feedLoading}
                  onRefresh={() => {
                    if (latitude == null || longitude == null) return;
                    setDismissedSuggestionIds([]);
                    void dispatch(
                      fetchSwipeFeed({
                        latitude,
                        longitude,
                        sector: selectedSector ?? undefined,
                        maxDistanceKm: filters.distanceKm ?? undefined,
                        ...modeParams(homeMode),
                      }),
                    );
                  }}
                />
              </div>
              <div className="flex-1 space-y-2.5">
                {matching.feedLoading && !matching.feedLoaded ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-14 animate-pulse rounded-2xl bg-white"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                ) : visiblePicks.length === 0 ? (
                  <DiscoverEmptyPicks />
                ) : (
                  visiblePicks.map((profile, i) => (
                    <AIRecommendationItem
                      key={profile.id}
                      profile={profile}
                      rank={i}
                      locked={isPickLocked(profile, i)}
                      onDismiss={() => {
                        setDismissedSuggestionIds((prev) => [...prev, profile.id]);
                      }}
                      onClick={() => {
                        if (isPickLocked(profile, i)) {
                          openPlanModal('locked_profile');
                          return;
                        }
                        setDetailProfileId(profile.id);
                        setDetailOpen(true);
                      }}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {detailOpen && detailProfile && (
        <ProfileDetailModal
          profile={detailProfile}
          source="discovery"
          busy={matching.swipeLoading}
          onClose={() => {
            setDetailOpen(false);
            setDetailProfileId(null);
          }}
          onPass={() => {
            setDetailOpen(false);
            setDetailProfileId(null);
            if (detailProfile.id === top?.id) void onPass();
          }}
          onConnect={() => {
            setDetailOpen(false);
            setDetailProfileId(null);
            if (detailProfile.id === top?.id) void onConnect();
          }}
        />
      )}

      {(matching.showQuotaModal || forceQuotaModal) && (
        <SwipeLimitModal
          reason={forceQuotaModal ? quotaModalReason : 'limit'}
          onUpgrade={() => router.push('/settings/plans')}
          onClose={() => {
            setForceQuotaModal(false);
            setQuotaModalReason('limit');
            dispatch(closeQuotaModal());
          }}
        />
      )}

      {matching.celebrationProfile && (
        <MatchCelebrationModal
          profile={matching.celebrationProfile}
          onContinue={() => dispatch(clearCelebration())}
          onViewMatches={() => {
            dispatch(clearCelebration());
            router.push('/matches');
          }}
        />
      )}

      <DiscoverFiltersSheet
        open={isFiltersSheetOpen}
        filters={filters}
        resultCount={matching.feed.length}
        onClose={() => setIsFiltersSheetOpen(false)}
        onChange={handleUpdateFilters}
        onReset={() => handleUpdateFilters(DEFAULT_DISCOVER_FILTERS)}
      />

      {mounted &&
        isSearchOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={searchDropdownRef}
            data-testid="sector-search-dropdown"
            style={{
              position: 'fixed',
              top: dropdownCoords?.top ?? 100,
              left: dropdownCoords?.left ?? 16,
              zIndex: 90,
            }}
            className="w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xl transition-all duration-150 sm:w-80"
          >
            <div className="sticky top-0 z-10 bg-white pb-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  data-testid="sector-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('matching.home.sectorSearch')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-7 pl-8 text-xs text-slate-800 placeholder-slate-400 focus:border-[#2F76BB] focus:bg-white focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-1 pt-0.5 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              <span>{t('matching.home.sectors')}</span>
              {selectedSector && (
                <button
                  type="button"
                  onClick={() => {
                    handleSelectSector(null);
                    setIsSearchOpen(false);
                  }}
                  className="cursor-pointer text-xs font-semibold text-[#2F76BB] hover:underline"
                >
                  {locale === 'ar' ? 'إعادة ضبط' : locale === 'en' ? 'Clear' : 'Effacer'}
                </button>
              )}
            </div>

            <div className="no-scrollbar max-h-72 space-y-1 overflow-y-auto py-0.5">
              {filteredDropdownSectors.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-slate-400">
                  {locale === 'ar'
                    ? 'لا توجد نتائج'
                    : locale === 'en'
                      ? 'No sectors found'
                      : 'Aucun secteur trouvé'}
                </div>
              ) : (
                filteredDropdownSectors.map((sector) => {
                  const isSelected = selectedSector === sector;
                  return (
                    <button
                      key={sector}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      data-testid={`sector-pill-${sector}`}
                      onClick={() => {
                        handleSelectSector(isSelected ? null : sector);
                        setIsSearchOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-start text-sm transition-colors hover:bg-gray-50 ${
                        isSelected ? 'font-bold text-[#2F76BB]' : 'text-gray-700'
                      }`}
                    >
                      <span
                        className="grid h-9 w-9 flex-none place-items-center rounded-lg text-white"
                        style={{
                          background: `linear-gradient(150deg, ${INDUSTRY_LOOK[sector]?.from ?? '#1f5f9e'}, ${INDUSTRY_LOOK[sector]?.to ?? '#61bca6'})`,
                        }}
                      >
                        {INDUSTRY_LOOK[sector]?.icon ?? getSectorIcon(sector)}
                      </span>
                      <span className="flex-1">{formatSectorLabel(sector, t)}</span>
                      {isSelected && <Check size={16} />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
