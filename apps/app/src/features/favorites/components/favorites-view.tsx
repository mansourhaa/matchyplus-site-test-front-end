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
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  MessageCircle,
  Search,
  Star,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function formatDate(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(
      locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR',
      {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(d);
  } catch {
    return '';
  }
}

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

  useEffect(() => {
    void dispatch(fetchFavorites());
    void dispatch(fetchMatchState());
  }, [dispatch]);

  // Build lookup sets for connection status
  const matchedIds = useMemo(() => {
    const set = new Set<string>();
    for (const row of matching.matches ?? []) {
      if (row.matched_user_id) set.add(row.matched_user_id);
    }
    return set;
  }, [matching.matches]);

  const pendingIds = useMemo(() => {
    const set = new Set<string>();
    for (const row of matching.pending ?? []) {
      if (row.profile?.id) set.add(row.profile.id);
    }
    return set;
  }, [matching.pending]);

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
        toast.success(
          locale === 'en'
            ? `It's a Match with ${profile.name}! 🎉`
            : locale === 'ar'
              ? `توافق مع ${profile.name}! 🎉`
              : `C'est un Match avec ${profile.name} ! 🎉`,
        );
      } else {
        toast.success(
          locale === 'en'
            ? `Connection request sent to ${profile.name}`
            : locale === 'ar'
              ? `تم إرسال طلب الاتصال إلى ${profile.name}`
              : `Demande de connexion envoyée à ${profile.name}`,
        );
      }
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
          /* Empty State */
          <div
            className="flex flex-col items-center justify-center rounded-3xl bg-white p-10 text-center shadow-xs"
            style={{ border: `1px solid ${matchyBrand.border}` }}
          >
            <div
              className="mb-4 flex h-20 w-20 items-center justify-center rounded-full shadow-inner"
              style={{ background: '#FFF8EB' }}
            >
              <Bookmark size={36} color="#F5A623" fill="#F5A623" />
            </div>

            <h2 className="text-base font-extrabold" style={{ color: matchyBrand.textDark }}>
              {searchQuery
                ? t('settings.favoritesEmptySearchTitle')
                : t('settings.favoritesEmptyTitle')}
            </h2>

            <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#777]">
              {searchQuery
                ? t('settings.favoritesEmptySearchDesc')
                : t('settings.favoritesEmptyDesc')}
            </p>

            <Link
              href="/home"
              className="mt-6 flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-bold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
              style={{ background: matchyBrand.gradient }}
            >
              <Compass size={15} />
              <span>{t('settings.discoverProfiles')}</span>
            </Link>
          </div>
        ) : (
          /* Favorites Horizontal Feed List — Exactly like Activity History */
          <div className="space-y-3">
            {filteredFavorites.map((profile) => {
              const isBusy = Boolean(actionLoading[profile.id]);

              return (
                <div
                  key={profile.id}
                  onClick={() => setSelectedProfile(profile)}
                  className="group flex cursor-pointer flex-col gap-3 rounded-3xl bg-white p-4 shadow-xs transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  style={{ border: `1px solid ${matchyBrand.border}` }}
                >
                  {/* Profile Summary */}
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div className="h-14 w-14 overflow-hidden rounded-2xl shadow-inner">
                        <AuthenticatedProfileAvatar
                          image={profile.image}
                          name={profile.name}
                          sizeClassName="h-14 w-14"
                          roundedClassName="rounded-2xl"
                        />
                      </div>

                      {/* Bookmark Icon Bubble */}
                      <div
                        className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full shadow-xs ring-2 ring-white"
                        style={{ background: '#F5A623', color: '#FFF' }}
                      >
                        <Bookmark size={10} fill="white" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2
                          className="truncate text-sm font-extrabold"
                          style={{ color: matchyBrand.textDark }}
                        >
                          {profile.name}
                        </h2>

                        {typeof profile.rating === 'number' && profile.rating > 0 && (
                          <span className="flex items-center gap-0.5 rounded-md bg-[#FFF8EB] px-1.5 py-0.5 text-[10px] font-bold text-[#F5A623]">
                            <Star size={10} className="fill-current" />
                            {profile.rating.toFixed(1)}
                          </span>
                        )}

                        {profile.match_score != null && (
                          <span className="rounded-full bg-[#EBF5FB] px-2 py-0.5 text-[10px] font-bold text-[#2F76BB]">
                            {profile.match_score}% Match
                          </span>
                        )}
                      </div>

                      <p className="truncate text-xs font-semibold text-[#666]">
                        {profile.service_type || profile.job || profile.category || 'Member'}
                        {profile.city ? ` · ${profile.city}` : ''}
                        {profile.distance_km != null ? ` (${profile.distance_km} km)` : ''}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        {profile.experience && (
                          <span className="flex items-center gap-1 rounded-md bg-[#F5F7FA] px-1.5 py-0.5 text-[10px] font-semibold text-[#555]">
                            <Briefcase size={9} color="#2F76BB" />
                            {profile.experience}
                          </span>
                        )}

                        {profile.price && (
                          <span className="rounded-md bg-[#EBF8F5] px-1.5 py-0.5 text-[10px] font-bold text-[#61BCA6]">
                            {profile.price}
                          </span>
                        )}

                        <span className="text-[10px] text-[#AAA]">
                          {formatDate(profile.favorited_at, locale)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProfile(profile);
                      }}
                      className="rounded-xl px-3 py-2 text-xs font-bold transition-all hover:bg-gray-100 active:scale-95"
                      style={{
                        border: `1px solid ${matchyBrand.border}`,
                        color: matchyBrand.textDark,
                      }}
                    >
                      {t('activityHistory.viewProfile') || 'Voir profil'}
                    </button>

                    {matchedIds.has(profile.id) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const convId = getConversationId(profile.id);
                          router.push(convId ? `/matches?c=${convId}` : '/matches');
                        }}
                        className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:scale-105 active:scale-95"
                        style={{ background: matchyBrand.gradient }}
                      >
                        <MessageCircle size={13} />
                        <span>
                          {locale === 'en' ? 'Chat' : locale === 'ar' ? 'محادثة' : 'Chat'}
                        </span>
                      </button>
                    ) : pendingIds.has(profile.id) ? (
                      <span
                        className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs"
                        style={{
                          background: '#FFF8EB',
                          border: '1px solid #F5D78E',
                          color: '#C48A1A',
                        }}
                      >
                        <Clock size={13} />
                        <span>
                          {locale === 'en' ? 'Pending' : locale === 'ar' ? 'معلق' : 'En attente'}
                        </span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleConnect(e, profile)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:scale-105 active:scale-95"
                        style={{ background: matchyBrand.gradient }}
                      >
                        <Zap size={13} fill="white" />
                        <span>{t('matching.connect') || 'Connecter'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, profile.id, profile.name)}
                      disabled={isBusy}
                      aria-label={
                        locale === 'en'
                          ? 'Remove from favorites'
                          : locale === 'ar'
                            ? 'إزالة من المفضلة'
                            : 'Retirer des favoris'
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-rose-50 hover:text-red-600 active:scale-95"
                      style={{
                        border: `1px solid ${matchyBrand.border}`,
                        color: '#AAA',
                      }}
                    >
                      <Trash2 size={13} />
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
            await dispatch(
              swipeProfile({ targetUserId: selectedProfile.id, direction: 'right' }),
            ).unwrap();
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
