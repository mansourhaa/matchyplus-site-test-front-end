'use client';

import { AuthenticatedProfileAvatar } from '@/components/matchy/authenticated-profile-image';
import { matchyBrand } from '@/components/matchy/brand';
import { MatchyHeaderActions } from '@/components/matchy/matchy-header-actions';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  useAutoCaptureGrantedLocation,
  useLocationGate,
} from '@/features/location/location-context';
import { MatchScoreBadge } from '@/features/matching/components/live-ai-score';
import { ProfileDetailModal } from '@/features/matching/components/profile-detail-modal';
import {
  DEFAULT_SEARCH_FILTERS,
  type SearchFilters,
  SearchFiltersSheet,
  countActiveSearchFilters,
} from '@/features/matching/components/search-filters-sheet';
import { SwipeLimitModal } from '@/features/matching/components/swipe-limit-modal';
import { formatInterest, formatRole } from '@/features/matching/lib/format-role';
import {
  closeQuotaModal,
  fetchMatchState,
  selectMatching,
  swipeProfile,
  withdrawPending,
} from '@/features/matching/store/matching-slice';
import type { FeedProfile, SwipeFeedResponse } from '@/features/matching/types';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Check, Clock, Filter, Loader2, Lock, MapPin, Search, Star, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SEARCH_PAGE_SIZE = 20;

function SearchProfileCard({
  profile,
  connectBlocked,
  connectionStatus,
  onConnect,
  onRemove,
  onDetail,
}: {
  profile: FeedProfile;
  connectBlocked: boolean;
  connectionStatus?: 'pending' | 'matched';
  onConnect: (profile: FeedProfile) => void;
  onRemove: (profile: FeedProfile) => void;
  onDetail: (profile: FeedProfile) => void;
}) {
  const { t, locale } = useI18n();
  const rawRole = profile.service_type || profile.job || profile.category || '';
  const role = formatRole(rawRole, t);

  const isPending = connectionStatus === 'pending';

  const passLabel = locale === 'fr' ? 'Passer' : locale === 'ar' ? 'تخطي' : 'Pass';

  const removeLabel = locale === 'fr' ? 'Retirer' : locale === 'ar' ? 'إزالة' : 'Remove';

  const pendingLabel =
    locale === 'fr' ? 'En attente' : locale === 'ar' ? 'في الانتظار' : 'Pending response';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onDetail(profile)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onDetail(profile);
      }}
      className="flex cursor-pointer gap-3 rounded-2xl p-3 transition-shadow hover:shadow-md"
      style={{
        background: 'white',
        border: profile.liked_me ? '1.5px solid #61BCA6' : '1px solid #F0F0F0',
        boxShadow: profile.liked_me
          ? '0 2px 14px rgba(97,188,166,0.2)'
          : '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      <div className="relative shrink-0">
        <AuthenticatedProfileAvatar image={profile.image} name={profile.name} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: '#353535' }}>
              {profile.name}
            </p>
            <p style={{ fontSize: 12, color: '#2F76BB', fontWeight: 500 }}>{role}</p>
          </div>
          <MatchScoreBadge score={profile.match_score} size="sm" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5">
            <Star size={11} color="#F5A623" fill="#F5A623" />
            <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>
              {profile.rating.toFixed(1)}
            </span>
          </div>
          {profile.distance_km != null && Number.isFinite(profile.distance_km) && (
            <div className="flex items-center gap-0.5">
              <MapPin size={11} color="#61BCA6" />
              <span style={{ fontSize: 11, color: '#AAA' }}>{profile.distance_km} km</span>
            </div>
          )}
        </div>
        {profile.interests?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {profile.interests.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-1.5 py-0.5"
                style={{
                  fontSize: 10,
                  background: '#F0F7FF',
                  color: '#2F76BB',
                  border: '1px solid #D6E8FA',
                }}
              >
                {formatInterest(tag, t)}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {isPending ? (
            <>
              {/* Left Button: Pending response (amber) */}
              <button
                type="button"
                disabled
                className="flex flex-1 cursor-default items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-bold"
                style={{
                  background: '#FFFDF0',
                  color: '#F59E0B',
                  border: '1.5px solid #F59E0B',
                  fontSize: 11,
                }}
              >
                <Clock size={13} color="#F59E0B" />
                <span>{pendingLabel}</span>
              </button>

              {/* Right Button: Remove (red) */}
              <button
                type="button"
                onClick={() => onRemove(profile)}
                className="flex flex-1 items-center justify-center gap-1 rounded-full py-1.5 transition-opacity hover:opacity-90"
                style={{
                  background: '#FFF1F2',
                  border: '1px solid #FECDD3',
                  color: '#E11D48',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <X size={13} color="#E11D48" />
                <span>{removeLabel}</span>
              </button>
            </>
          ) : (
            <>
              {/* Left Button: Connect (gradient) */}
              <button
                type="button"
                disabled={connectBlocked}
                onClick={() => onConnect(profile)}
                className="flex-1 rounded-full py-1.5 text-white transition-opacity hover:opacity-95"
                style={{
                  background: connectBlocked
                    ? 'linear-gradient(90deg, #B0B0B0, #888)'
                    : matchyBrand.gradient,
                  fontSize: 11,
                  fontWeight: 700,
                  opacity: connectBlocked ? 0.85 : 1,
                }}
              >
                {connectBlocked ? (
                  <span className="inline-flex items-center justify-center gap-1">
                    <Lock size={11} />
                    {t('matching.connect')}
                  </span>
                ) : (
                  t('matching.connect')
                )}
              </button>

              {/* Right Button: Pass (secondary neutral) */}
              <button
                type="button"
                onClick={() => onRemove(profile)}
                className="flex flex-1 items-center justify-center gap-1 rounded-full py-1.5 transition-opacity hover:bg-[#E2E8F0]"
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <X size={13} className="text-[#64748B]" />
                <span>{passLabel}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LockedSearchProfileCard({
  profile,
  lockedLabel,
  onUpgrade,
}: {
  profile: FeedProfile;
  lockedLabel: string;
  onUpgrade: () => void;
}) {
  const { t } = useI18n();
  const rawRole = profile.service_type || profile.job || profile.category || '';
  const role = formatRole(rawRole, t);

  return (
    <button
      type="button"
      onClick={onUpgrade}
      className="relative block w-full overflow-hidden rounded-2xl text-left"
      style={{
        background: 'white',
        border: '1px solid #F0F0F0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ filter: 'blur(6px)', pointerEvents: 'none' }}>
        <div className="flex gap-3 p-3">
          <div className="relative shrink-0">
            <div
              className="h-16 w-16 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #D0D0D0, #B0B0B0)' }}
            />
            <div
              className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white"
              style={{ background: '#61BCA6' }}
            />
          </div>
          <div className="flex-1">
            <p style={{ fontSize: 14, fontWeight: 700, color: '#353535' }}>███████</p>
            <p style={{ fontSize: 12, color: '#2F76BB' }}>{role}</p>
            <div className="mt-1 flex items-center gap-2">
              <span style={{ fontSize: 11, color: '#888' }}>
                ⭐ {profile.rating > 0 ? profile.rating.toFixed(1) : '—'}
              </span>
              {profile.distance_km != null && Number.isFinite(profile.distance_km) && (
                <span style={{ fontSize: 11, color: '#AAA' }}>📍 {profile.distance_km} km</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(3px)' }}
      >
        <div
          className="mb-2 flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: matchyBrand.gradient135 }}
        >
          <Lock size={20} color="white" />
        </div>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#353535' }}>{lockedLabel}</p>
      </div>
    </button>
  );
}

export function SearchView() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const matching = useAppSelector(selectMatching);
  const {
    latitude,
    longitude,
    locationRequired,
    activating,
    accessMessage,
    requestBrowserLocation,
    locationSynced,
  } = useLocationGate();
  useAutoCaptureGrantedLocation();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [profiles, setProfiles] = useState<FeedProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [detailProfile, setDetailProfile] = useState<FeedProfile | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    void dispatch(fetchMatchState());
  }, [dispatch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const activeFilterCount = useMemo(() => countActiveSearchFilters(filters), [filters]);

  const buildParams = useCallback(
    (pageOffset: number) => {
      const params: Record<string, string | number | boolean> = {
        latitude: latitude!,
        longitude: longitude!,
        context: 'search',
        limit: SEARCH_PAGE_SIZE,
        offset: pageOffset,
        sort: filters.sort,
      };
      if (debouncedQuery) params.q = debouncedQuery;
      if (filters.sectors && filters.sectors.length > 0) {
        params.sectors = filters.sectors.join(',');
      } else if (filters.sector) {
        params.sector = filters.sector;
      }
      if (filters.interests && filters.interests.length > 0) {
        params.interests = filters.interests.join(',');
      }
      if (filters.maxDistanceKm) params.maxDistanceKm = filters.maxDistanceKm;
      if (filters.minRating > 0) params.minRating = filters.minRating;
      if (filters.minPrice > 5) params.minPrice = filters.minPrice;
      if (filters.maxPrice != null) params.maxPrice = filters.maxPrice;
      if (filters.availableOnly) params.availableOnly = true;
      return params;
    },
    [latitude, longitude, filters, debouncedQuery],
  );

  const loadSearchFeed = useCallback(
    async (mode: 'replace' | 'append' = 'replace') => {
      if (latitude == null || longitude == null) return;
      const pageOffset = mode === 'append' ? offset : 0;
      const requestId = ++requestIdRef.current;
      if (mode === 'append') setLoadingMore(true);
      else setLoading(true);

      try {
        const response = await api.get<SwipeFeedResponse>('/discovery/swipe-feed', {
          params: buildParams(pageOffset),
        });
        if (requestId !== requestIdRef.current) return;

        const next = response.data.profiles ?? [];
        setProfiles((prev) => (mode === 'append' ? [...prev, ...next] : next));
        setHasMore(Boolean(response.data.has_more));
        setOffset(pageOffset + next.length);
        setLoaded(true);
      } catch {
        if (requestId === requestIdRef.current) {
          toast.error(t('matching.errors.feed'));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [latitude, longitude, offset, buildParams, t],
  );

  // Initial + filter/query-driven reloads (not append).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!locationSynced || latitude == null || longitude == null) {
        setProfiles([]);
        setLoaded(false);
      } else {
        void loadSearchFeed('replace');
      }
    }, 0);

    return () => clearTimeout(timer);

    // Intentionally omit loadSearchFeed — rebuild when filters / debounced query / location change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationSynced, latitude, longitude, filters, debouncedQuery]);

  const [connectedStatuses, setConnectedStatuses] = useState<Record<string, 'pending' | 'matched'>>(
    {},
  );

  const getProfileConnectionStatus = useCallback(
    (profileId: string): 'pending' | 'matched' | undefined => {
      if (connectedStatuses[profileId]) return connectedStatuses[profileId];
      if (matching.matches.some((m) => m.profile?.id === profileId)) return 'matched';
      if (matching.pending.some((p) => p.profile?.id === profileId)) return 'pending';
      return undefined;
    },
    [connectedStatuses, matching.matches, matching.pending],
  );

  const visibleProfiles = profiles.filter((p) => {
    if (p.is_locked) return false;
    const status = getProfileConnectionStatus(p.id);
    return status !== 'matched';
  });

  const lockedProfiles = profiles.filter((p) => p.is_locked);

  const connectBlocked = Boolean(
    matching.quota && !matching.quota.unlimited && (matching.quota.remaining ?? 0) <= 0,
  );

  const removeFromFeed = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleConnect = async (profile: FeedProfile) => {
    if (profile.is_locked) {
      toast.message(t('settings.comingSoon'));
      return;
    }
    if (connectBlocked) {
      toast.message(t('matching.limitReached'));
      return;
    }
    const result = await dispatch(
      swipeProfile({ targetUserId: profile.id, direction: 'right', profile }),
    );
    if (swipeProfile.fulfilled.match(result)) {
      const isMatch = Boolean(result.payload.match);
      setConnectedStatuses((prev) => ({
        ...prev,
        [profile.id]: isMatch ? 'matched' : 'pending',
      }));
      if (isMatch) {
        toast.success(t('matching.itsAMatch'));
        removeFromFeed(profile.id);
      }
    }
  };

  const handleRemove = async (profile: FeedProfile) => {
    if (profile.is_locked) return;
    const status = getProfileConnectionStatus(profile.id);
    if (status === 'pending') {
      await dispatch(withdrawPending(profile.id));
      setConnectedStatuses((prev) => {
        const next = { ...prev };
        delete next[profile.id];
        return next;
      });
    } else {
      const result = await dispatch(
        swipeProfile({ targetUserId: profile.id, direction: 'left', profile }),
      );
      if (swipeProfile.fulfilled.match(result)) {
        removeFromFeed(profile.id);
      }
    }
  };

  const title = locale === 'fr' ? 'Recherche' : locale === 'ar' ? 'بحث' : t('search.title');

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      style={{ background: matchyBrand.bg }}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4 md:px-8">
        {!locationRequired && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <div
                className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'white', border: '1px solid #E0E0E0' }}
              >
                <Search size={16} color="#999" />
                <input
                  className="flex-1 bg-transparent text-[#353535] outline-none"
                  style={{ fontSize: 13 }}
                  placeholder={t('search.placeholder')}
                  value={query ?? ''}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')}>
                    <X size={14} color="#CCC" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(filters);
                  setFiltersOpen(true);
                }}
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'white', border: '1px solid #E0E0E0' }}
                aria-label={t('search.filters')}
              >
                <Filter size={18} color="#5C5C5C" />
                {activeFilterCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ background: matchyBrand.blue }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {lockedProfiles.length > 0 ? (
              <p className="mb-3 text-[11px] font-semibold text-[#888]">
                {t('search.freeVisibleHint')}
              </p>
            ) : null}

            <div className="relative flex-1 overflow-y-auto pb-4">
              {loading && !loaded ? (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#61BCA6]" />
                  <p className="text-[#888]" style={{ fontSize: 14 }}>
                    {t('matching.loadingFeed')}
                  </p>
                </div>
              ) : profiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EBF5FB]">
                    <Search size={24} className="text-[#2F76BB]" />
                  </div>
                  <h3 className="text-base font-extrabold text-[#1E293B]">{t('search.empty')}</h3>
                  <p className="mt-1 text-xs font-medium text-[#94A3B8]">
                    {locale === 'en'
                      ? 'Try adjusting your search terms or filters'
                      : locale === 'ar'
                        ? 'حاول تعديل كلمات البحث أو الفلاتر'
                        : 'Essayez de modifier vos termes de recherche ou vos filtres'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {loading && (
                    <div className="flex justify-center py-1">
                      <Loader2 className="h-5 w-5 animate-spin text-[#61BCA6]" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {visibleProfiles.map((profile: FeedProfile) => (
                      <SearchProfileCard
                        key={profile.id}
                        profile={profile}
                        connectBlocked={connectBlocked}
                        connectionStatus={getProfileConnectionStatus(profile.id)}
                        onConnect={(p) => void handleConnect(p)}
                        onRemove={(p) => void handleRemove(p)}
                        onDetail={setDetailProfile}
                      />
                    ))}
                    {lockedProfiles.map((profile) => (
                      <LockedSearchProfileCard
                        key={profile.id}
                        profile={profile}
                        lockedLabel={t('search.lockedProfile')}
                        onUpgrade={() => toast.message(t('settings.comingSoon'))}
                      />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() => void loadSearchFeed('append')}
                        className="rounded-2xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-70"
                        style={{ background: matchyBrand.gradient }}
                      >
                        {loadingMore ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('search.loadMore')}
                          </span>
                        ) : (
                          t('search.loadMore')
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <SearchFiltersSheet
        open={filtersOpen}
        draft={draftFilters}
        onChange={setDraftFilters}
        onClose={() => setFiltersOpen(false)}
        onReset={() => setDraftFilters(DEFAULT_SEARCH_FILTERS)}
        onApply={() => {
          setFilters(draftFilters);
          setFiltersOpen(false);
        }}
      />

      {detailProfile && !detailProfile.is_locked && (
        <ProfileDetailModal
          profile={{
            ...detailProfile,
            pending: getProfileConnectionStatus(detailProfile.id) === 'pending',
            matched: getProfileConnectionStatus(detailProfile.id) === 'matched',
          }}
          source="search"
          busy={matching.swipeLoading}
          onClose={() => setDetailProfile(null)}
          onPass={() => {
            const profile = detailProfile;
            setDetailProfile(null);
            void handleRemove(profile);
          }}
          onConnect={() => {
            const profile = detailProfile;
            void handleConnect(profile);
          }}
          onWithdraw={() => {
            const profile = detailProfile;
            void handleRemove(profile);
          }}
        />
      )}
      {matching.showQuotaModal && <SwipeLimitModal onClose={() => dispatch(closeQuotaModal())} />}
    </div>
  );
}
