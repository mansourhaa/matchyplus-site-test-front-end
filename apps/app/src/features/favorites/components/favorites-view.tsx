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

function formatDailyPrice(price: string | null | undefined, locale: string): string | null {
  if (!price) return null;
  const trimmed = price.trim();
  if (!trimmed) return null;

  const perDaySuffix = locale === 'ar' ? '/يوم' : locale === 'en' ? '/day' : '/jour';
  const currency = locale === 'ar' ? 'د.ت' : 'DT';

  // If already specified per hour, replace it with per day
  if (/\/(h|hour|hr|heure|ساعة|س)/i.test(trimmed)) {
    return trimmed.replace(/\/(h|hour|hr|heure|ساعة|س)/i, perDaySuffix);
  }

  // If already specifies day
  if (/\/(day|jour|j|يوم)/i.test(trimmed)) {
    return trimmed;
  }

  // If ends with DT, TND, or د.ت without a slash
  if (/(DT|TND|د\.ت)$/i.test(trimmed)) {
    return `${trimmed}${perDaySuffix}`;
  }

  // If purely numeric
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed} ${currency}${perDaySuffix}`;
  }

  // If starts with number and contains currency
  if (/^\d+(\.\d+)?\s*(DT|TND)/i.test(trimmed)) {
    return `${trimmed}${perDaySuffix}`;
  }

  return `${trimmed} ${perDaySuffix}`;
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
      <div className="w-full space-y-6 px-4 py-6 md:px-8">
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
        ) : (favorites ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF8EB]">
              <Bookmark size={24} className="text-[#F5A623]" />
            </div>
            <h3 className="text-base font-extrabold text-[#1E293B]">
              {locale === 'en'
                ? 'No Favorites yet'
                : locale === 'ar'
                  ? 'لا توجد مفضلة بعد'
                  : 'Aucun favori pour le moment'}
            </h3>
            <p className="mt-1 text-xs font-medium text-[#94A3B8]">
              {locale === 'en'
                ? 'Add profiles to favorites from the home screen'
                : locale === 'ar'
                  ? 'أضف الملفات الشخصية إلى المفضلة من الشاشة الرئيسية'
                  : 'Ajoutez des profils aux favoris depuis l’écran d’accueil'}
            </p>
          </div>
        ) : (
          /* Favorites List — Responsive cards with connect status and remove actions */
          <div className="space-y-3.5">
            {filteredFavorites.map((profile) => {
              const isBusy = Boolean(actionLoading[profile.id]);
              const isPending = pendingIds.has(profile.id);
              const isMatched = matchedIds.has(profile.id);
              const dailyPrice = formatDailyPrice(profile.price, locale);

              return (
                <div
                  key={profile.id}
                  onClick={() => setSelectedProfile(profile)}
                  className="group flex cursor-pointer flex-col gap-3 rounded-3xl bg-white p-4.5 shadow-xs transition-all hover:shadow-md"
                  style={{ border: `1px solid ${matchyBrand.border}` }}
                >
                  {/* Top Row: Avatar + Details + Actions */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                      {/* Avatar with status indicator dot */}
                      <div className="relative mt-0.5 shrink-0">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#334155] text-xl font-bold text-white shadow-inner sm:h-16 sm:w-16">
                          {profile.image ? (
                            <AuthenticatedProfileAvatar
                              image={profile.image}
                              name={profile.name}
                              sizeClassName="h-14 w-14 sm:h-16 sm:w-16"
                              roundedClassName="rounded-2xl"
                            />
                          ) : (
                            <span>{(profile.name || 'M').charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        {/* Status indicator dot */}
                        <span
                          className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full shadow-xs ring-2 ring-white"
                          style={{ background: '#4EAD96' }}
                        />
                      </div>

                      {/* Middle Details */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        {/* Name & Age */}
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <h2
                            className="truncate text-sm font-extrabold"
                            style={{ color: matchyBrand.textDark }}
                          >
                            {profile.name}
                          </h2>
                          {(profile as any).age ? (
                            <span className="text-xs font-normal text-[#94A3B8]">
                              {(profile as any).age}{' '}
                              {locale === 'ar' ? 'سنة' : locale === 'en' ? 'yo' : 'ans'}
                            </span>
                          ) : null}
                        </div>

                        {/* Category & Service / Job */}
                        <p className="truncate text-xs font-medium text-[#64748B]">
                          {profile.service_type || profile.job || profile.category || 'Member'}
                        </p>

                        {/* Meta Info: Rating, Distance, Price per day */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-[#64748B]">
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

                          {dailyPrice && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="font-medium text-[#64748B]">{dailyPrice}</span>
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
                      </div>
                    </div>

                    {/* Right Actions: Connect/Pending status button + Retirer button */}
                    <div className="flex shrink-0 flex-row items-center gap-2 self-end sm:self-center">
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
                            background: '#FFFDF0',
                            border: '1.5px solid #F59E0B',
                            color: '#F59E0B',
                          }}
                        >
                          <Clock size={13} color="#F59E0B" />
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

                  {/* Bottom Row: Tags / Interests Badges spanning under avatar */}
                  {profile.interests && profile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {profile.interests.slice(0, 5).map((interest) => (
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
          source="favorites"
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
