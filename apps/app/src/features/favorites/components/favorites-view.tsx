'use client';

import { AuthenticatedProfileAvatar } from '@/components/matchy/authenticated-profile-image';
import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import {
  fetchFavorites,
  removeFavorite,
  selectFavorites,
} from '@/features/favorites/store/favorites-slice';
import type { FavoriteProfile } from '@/features/favorites/types';
import { useI18n } from '@/features/i18n/i18n-provider';
import { ProfileDetailModal } from '@/features/matching/components/profile-detail-modal';
import {
  fetchMatchState,
  selectMatching,
  swipeProfile,
} from '@/features/matching/store/matching-slice';
import {
  Bookmark,
  Clock,
  Compass,
  MapPin,
  MessageCircle,
  Search,
  Star,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export function FavoritesView() {
  const { t, locale, dir } = useI18n();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const isSettings = pathname.startsWith('/settings');
  const isRtl = locale === 'ar';

  const { favorites, total, loading, actionLoading, error } = useAppSelector(selectFavorites);
  const matching = useAppSelector(selectMatching);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<FavoriteProfile | null>(null);
  const [localPendingIds, setLocalPendingIds] = useState<Set<string>>(() => new Set());
  const [localMatchedIds, setLocalMatchedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    void dispatch(fetchFavorites());
    void dispatch(fetchMatchState());
  }, [dispatch]);

  // Build lookup sets for connection status
  const matchedIds = useMemo(() => {
    const set = new Set<string>(localMatchedIds);
    for (const row of matching.matches ?? []) {
      if (row.matched_user_id) set.add(row.matched_user_id);
    }
    return set;
  }, [matching.matches, localMatchedIds]);

  const pendingIds = useMemo(() => {
    const set = new Set<string>(localPendingIds);
    for (const row of matching.pending ?? []) {
      if (row.profile?.id) set.add(row.profile.id);
    }
    return set;
  }, [matching.pending, localPendingIds]);

  // Find conversation_id for matched users
  const getConversationId = (profileId: string): string | null => {
    const row = matching.matches?.find((m) => m.matched_user_id === profileId);
    return row?.conversation_id ?? null;
  };

  const handleRefresh = () => {
    void dispatch(fetchFavorites());
  };

  const filteredFavorites = useMemo(() => {
    const items = favorites ?? [];
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const nameMatch = item?.name?.toLowerCase().includes(q) || false;
      const jobMatch = item?.job?.toLowerCase().includes(q) || false;
      const cityMatch = item?.city?.toLowerCase().includes(q) || false;
      const categoryMatch = item?.category?.toLowerCase().includes(q) || false;
      const serviceMatch = item?.service_type?.toLowerCase().includes(q) || false;
      return nameMatch || jobMatch || cityMatch || categoryMatch || serviceMatch;
    });
  }, [favorites, searchQuery]);

  const handleRemove = async (e: React.MouseEvent, profileId: string, profileName: string) => {
    e.stopPropagation();
    try {
      await dispatch(removeFavorite(profileId)).unwrap();
      toast.success(
        locale === 'en'
          ? `${profileName} removed from favorites`
          : locale === 'ar'
            ? `تمت إزالة ${profileName} من المفضلة`
            : `${profileName} retiré des favoris`,
      );
    } catch {
      toast.error(t('common.errorOccurred') || 'Error');
    }
  };

  const handleConnect = async (e: React.MouseEvent, profile: FavoriteProfile) => {
    e.stopPropagation();
    try {
      const res = await dispatch(
        swipeProfile({ targetUserId: profile.id, direction: 'right' }),
      ).unwrap();
      if (res.match) {
        setLocalMatchedIds((prev) => new Set(prev).add(profile.id));
        toast.success(
          locale === 'en'
            ? `It's a Match with ${profile.name}! 🎉`
            : locale === 'ar'
              ? `توافق مع ${profile.name}! 🎉`
              : `C'est un Match avec ${profile.name} ! 🎉`,
        );
      } else {
        setLocalPendingIds((prev) => new Set(prev).add(profile.id));
        toast.success(
          locale === 'en'
            ? `Connection request sent to ${profile.name}`
            : locale === 'ar'
              ? `تم إرسال طلب الاتصال إلى ${profile.name}`
              : `Demande de connexion envoyée à ${profile.name}`,
        );
      }
      void dispatch(fetchMatchState());
    } catch {
      toast.error(t('common.errorOccurred') || 'Error');
    }
  };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: matchyBrand.bg }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search
            size={16}
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${
              isRtl ? 'right-3.5' : 'left-3.5'
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              locale === 'en'
                ? 'Search favorites...'
                : locale === 'ar'
                  ? 'البحث في المفضلة...'
                  : 'Rechercher dans les favoris...'
            }
            className={`w-full rounded-2xl bg-white py-2.5 text-xs font-medium text-gray-800 shadow-xs placeholder:text-gray-400 focus:outline-none ${
              isRtl ? 'pr-10 pl-3.5' : 'pr-3.5 pl-10'
            }`}
            style={{ border: `1px solid ${matchyBrand.border}` }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${
                isRtl ? 'left-3.5' : 'right-3.5'
              }`}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center justify-between rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-600">
            <span>{error}</span>
            <button type="button" onClick={handleRefresh} className="underline hover:no-underline">
              {t('common.retry') || 'Retry'}
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && favorites.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex animate-pulse items-center justify-between rounded-3xl bg-white p-4 shadow-xs"
                style={{ border: `1px solid ${matchyBrand.border}` }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-gray-200" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded-md bg-gray-200" />
                    <div className="h-3 w-24 rounded-md bg-gray-100" />
                  </div>
                </div>
                <div className="h-8 w-24 rounded-xl bg-gray-100" />
              </div>
            ))}
          </div>
        ) : filteredFavorites.length === 0 ? (
          <p className="py-16 text-center text-sm font-medium text-[#64748B]">
            {searchQuery
              ? t('settings.favoritesEmptySearchTitle')
              : t('settings.favoritesEmptyTitle')}
          </p>
        ) : (
          /* Favorites List — Responsive cards with connect status and remove actions */
          <div className="space-y-3.5">
            {filteredFavorites.map((profile) => {
              const isBusy = Boolean(actionLoading[profile.id]);
              const isPending = pendingIds.has(profile.id);
              const isMatched = matchedIds.has(profile.id);

              return (
                <div
                  key={profile.id}
                  onClick={() => setSelectedProfile(profile)}
                  className="group flex cursor-pointer flex-col gap-3.5 rounded-3xl bg-white p-4.5 shadow-xs transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  style={{ border: `1px solid ${matchyBrand.border}` }}
                >
                  {/* Left Section: Avatar + Details */}
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    {/* Avatar with status indicator dot */}
                    <div className="relative mt-0.5 shrink-0">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[#334155] text-xl font-bold text-white shadow-inner">
                        {profile.image ? (
                          <AuthenticatedProfileAvatar
                            image={profile.image}
                            name={profile.name}
                            sizeClassName="h-16 w-16"
                            roundedClassName="rounded-2xl"
                          />
                        ) : (
                          <span>{(profile.name || 'M').charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      {/* Status indicator dot */}
                      <span
                        className="absolute -right-0.5 -bottom-0.5 h-4 w-4 rounded-full shadow-xs ring-2 ring-white"
                        style={{ background: '#4EAD96' }}
                      />
                    </div>

                    {/* Middle Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Name */}
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <h2
                          className="truncate text-sm font-extrabold"
                          style={{ color: matchyBrand.textDark }}
                        >
                          {profile.name}
                        </h2>
                      </div>

                      {/* Category & Service / Job */}
                      <p className="truncate text-xs font-medium text-[#64748B]">
                        {profile.category ? `${profile.category} / ` : ''}
                        {profile.service_type || profile.job || 'Member'}
                      </p>

                      {/* Meta Info: Rating, Distance, Price */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                        <span className="flex items-center gap-1 font-bold text-[#1A1A2E]">
                          <Star size={13} className="fill-[#F5A623] text-[#F5A623]" />
                          {typeof profile.rating === 'number' && profile.rating > 0
                            ? profile.rating.toFixed(1)
                            : '5.0'}
                        </span>

                        <span className="text-gray-300">·</span>

                        <span className="flex items-center gap-0.5 font-medium text-[#2F76BB]">
                          <MapPin size={13} className="shrink-0" />
                          {profile.distance_km != null
                            ? `${profile.distance_km} km`
                            : profile.city || t('settings.favoritesNearby')}
                        </span>

                        {profile.price && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="font-bold text-[#0D9488]">{profile.price}</span>
                          </>
                        )}
                      </div>

                      {/* Status note if pending */}
                      {isPending && (
                        <div className="flex items-center gap-1 pt-0.5 text-[11px] font-semibold text-[#D97706]">
                          <Clock size={12} className="text-[#D97706]" />
                          <span>{t('settings.favoritesPendingDesc')}</span>
                        </div>
                      )}

                      {/* Tags / Interests Badges */}
                      {profile.interests && profile.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {profile.interests.slice(0, 4).map((interest) => (
                            <span
                              key={interest}
                              className="rounded-full border border-[#DCEBFA] bg-[#F0F7FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#2F76BB]"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Connect/Pending status button + Retirer button */}
                  <div className="flex shrink-0 flex-row items-end gap-2 self-end sm:flex-col sm:self-center">
                    {isMatched ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const convId = getConversationId(profile.id);
                          router.push(convId ? `/matches?c=${convId}` : '/matches');
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-xs font-bold text-[#2563EB] shadow-xs transition-transform hover:scale-105 active:scale-95"
                      >
                        <MessageCircle size={13} />
                        <span>
                          {locale === 'en' ? 'Chat' : locale === 'ar' ? 'محادثة' : 'Chat'}
                        </span>
                      </button>
                    ) : isPending ? (
                      <div
                        className="flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-xs select-none"
                        style={{
                          background: '#FFFBEB',
                          border: '1px solid #FEF08A',
                          color: '#D97706',
                        }}
                      >
                        <Clock size={13} className="text-[#D97706]" />
                        <span>{t('settings.favoritesPending')}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleConnect(e, profile)}
                        disabled={isBusy}
                        className="flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
                        style={{ background: matchyBrand.gradient }}
                      >
                        <Zap size={13} fill="white" />
                        <span>{t('settings.favoritesConnect')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, profile.id, profile.name)}
                      disabled={isBusy}
                      aria-label={t('settings.favoritesRemove')}
                      className="flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-xs transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
                      style={{
                        background: '#FEF2F2',
                        border: '1px solid #FEE2E2',
                        color: '#EF4444',
                      }}
                    >
                      <X size={13} strokeWidth={2.5} />
                      <span>{t('settings.favoritesRemove')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <ProfileDetailModal
          profile={{
            id: selectedProfile.id,
            name: selectedProfile.name,
            job: selectedProfile.job,
            category: selectedProfile.category,
            city: selectedProfile.city,
            bio: selectedProfile.bio,
            image: selectedProfile.image,
            video: selectedProfile.video,
            rating: selectedProfile.rating,
            reviews: selectedProfile.reviews,
            profile_type: selectedProfile.profile_type === 'PROVIDER' ? 'PROVIDER' : 'INDIVIDUAL',
            offer_service: selectedProfile.offer_service,
            service_type: selectedProfile.service_type,
            price: selectedProfile.price,
            experience: selectedProfile.experience,
            languages: selectedProfile.languages,
            interests: selectedProfile.interests,
            contact_modes: selectedProfile.contact_modes,
            match_score: selectedProfile.match_score,
            distance_km: selectedProfile.distance_km,
          }}
          onClose={() => setSelectedProfile(null)}
          onConnect={async () => {
            const targetId = selectedProfile.id;
            try {
              const res = await dispatch(
                swipeProfile({ targetUserId: targetId, direction: 'right' }),
              ).unwrap();
              if (res.match) {
                setLocalMatchedIds((prev) => new Set(prev).add(targetId));
              } else {
                setLocalPendingIds((prev) => new Set(prev).add(targetId));
              }
              void dispatch(fetchMatchState());
            } catch {
              // handled by thunk
            }
            setSelectedProfile(null);
          }}
          onPass={async () => {
            await dispatch(
              swipeProfile({ targetUserId: selectedProfile.id, direction: 'left' }),
            ).unwrap();
            setSelectedProfile(null);
          }}
        />
      )}
    </div>
  );
}
