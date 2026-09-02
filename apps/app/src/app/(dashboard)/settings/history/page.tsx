'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { useI18n } from '@/features/i18n/i18n-provider';
import { ProfileDetailModal } from '@/features/matching/components/profile-detail-modal';
import {
  fetchSwipeHistory,
  selectSwipeHistory,
  selectSwipeHistoryError,
  selectSwipeHistoryLoading,
  selectSwipeHistoryStats,
} from '@/features/matching/store/matching-slice';
import type {
  MatchingProfile,
  SwipeHistoryFilter,
  SwipeHistoryItem,
} from '@/features/matching/types';
import {
  Award,
  Clock,
  Compass,
  Heart,
  History,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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

export default function HistoryPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const isRtl = locale === 'ar';
  const historyItems = useAppSelector(selectSwipeHistory);
  const historyStats = useAppSelector(selectSwipeHistoryStats);
  const loading = useAppSelector(selectSwipeHistoryLoading);
  const error = useAppSelector(selectSwipeHistoryError);

  const [activeFilter, setActiveFilter] = useState<SwipeHistoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<MatchingProfile | null>(null);

  useEffect(() => {
    dispatch(fetchSwipeHistory({ direction: activeFilter }));
  }, [dispatch, activeFilter]);

  const handleRefresh = () => {
    dispatch(fetchSwipeHistory({ direction: activeFilter, q: searchQuery.trim() || undefined }));
  };

  const filteredItems = useMemo(() => {
    const items = historyItems ?? [];
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const nameMatch = item?.target?.name?.toLowerCase().includes(q) || false;
      const jobMatch = item?.target?.job?.toLowerCase().includes(q) || false;
      const cityMatch = item?.target?.city?.toLowerCase().includes(q) || false;
      const sectorMatch = item?.target?.activity_sector?.toLowerCase().includes(q) || false;
      return nameMatch || jobMatch || cityMatch || sectorMatch;
    });
  }, [historyItems, searchQuery]);

  const filterTabs: { key: SwipeHistoryFilter; label: string; count?: number }[] = [
    {
      key: 'all',
      label: t('activityHistory.tabAll'),
      count: historyStats?.total_swipes,
    },
    {
      key: 'right',
      label: t('activityHistory.tabLikes'),
      count: historyStats?.likes,
    },
    {
      key: 'match',
      label: t('activityHistory.tabMatches'),
      count: historyStats?.matches,
    },
    {
      key: 'left',
      label: t('activityHistory.tabPasses'),
      count: historyStats?.passes,
    },
  ];

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: matchyBrand.bg }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8">
        {/* Filter Controls & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Segmented Filter Tabs */}
          <div
            className="inline-flex rounded-2xl bg-white p-1 shadow-xs"
            style={{ border: `1px solid ${matchyBrand.border}` }}
          >
            {filterTabs.map((tab) => {
              const active = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className="relative flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
                  style={{
                    background: active ? matchyBrand.blue : 'transparent',
                    color: active ? '#FFF' : matchyBrand.muted,
                  }}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span
                      className="py-0.2 rounded-full px-1.5 text-[10px] font-bold"
                      style={{
                        background: active ? 'rgba(255,255,255,0.25)' : '#F0F0F0',
                        color: active ? '#FFF' : '#666',
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={15}
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${
                isRtl ? 'right-3' : 'left-3'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('activityHistory.searchPlaceholder')}
              className={`w-full rounded-2xl bg-white py-2 text-xs font-medium text-gray-800 shadow-xs placeholder:text-gray-400 focus:outline-none ${
                isRtl ? 'pr-9 pl-3' : 'pr-3 pl-9'
              }`}
              style={{ border: `1px solid ${matchyBrand.border}` }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${
                  isRtl ? 'left-3' : 'right-3'
                }`}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center justify-between rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-600">
            <span>{t('activityHistory.errorLoading')}</span>
            <button type="button" onClick={handleRefresh} className="underline hover:no-underline">
              {t('activityHistory.retry')}
            </button>
          </div>
        )}

        {/* Content List */}
        {loading && historyItems.length === 0 ? (
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
                <div className="h-6 w-16 rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="py-16 text-center text-sm font-medium text-[#64748B]">
            {activeFilter === 'right'
              ? t('activityHistory.emptyLikesTitle')
              : activeFilter === 'match'
                ? t('activityHistory.emptyMatchesTitle')
                : activeFilter === 'left'
                  ? t('activityHistory.emptyPassesTitle')
                  : t('activityHistory.emptyTitle')}
          </p>
        ) : (
          /* Activity Feed List */
          <div className="space-y-3">
            {filteredItems.map((item: SwipeHistoryItem) => {
              const isMatched = item.is_matched;
              const isLike = item.direction === 'RIGHT';
              const isPass = item.direction === 'LEFT';
              const isSuperlike = item.direction === 'SUPERLIKE';

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-xs transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  style={{ border: `1px solid ${matchyBrand.border}` }}
                >
                  {/* User Profile Summary */}
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      {item.target.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.target.image}
                          alt={item.target.name}
                          className="h-14 w-14 rounded-2xl object-cover shadow-inner"
                        />
                      ) : (
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-2xl font-bold"
                          style={{ background: matchyBrand.softBlue, color: matchyBrand.blue }}
                        >
                          <User size={24} />
                        </div>
                      )}

                      {/* Direction Icon Bubble */}
                      <div
                        className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full shadow-xs ring-2 ring-white"
                        style={{
                          background: isMatched
                            ? matchyBrand.blue
                            : isLike
                              ? matchyBrand.teal
                              : isSuperlike
                                ? '#F5A623'
                                : '#888',
                          color: '#FFF',
                        }}
                      >
                        {isMatched ? (
                          <Sparkles size={10} />
                        ) : isLike ? (
                          <Heart size={10} className="fill-current" />
                        ) : isSuperlike ? (
                          <Star size={10} className="fill-current" />
                        ) : (
                          <X size={10} />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className="truncate text-sm font-extrabold"
                          style={{ color: matchyBrand.textDark }}
                        >
                          {item.target.name}
                        </h3>

                        {typeof item.target.rating === 'number' && item.target.rating > 0 && (
                          <span className="flex items-center gap-0.5 rounded-md bg-[#FFF8EB] px-1.5 py-0.5 text-[10px] font-bold text-[#F5A623]">
                            <Star size={10} className="fill-current" />
                            {item.target.rating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <p className="truncate text-xs font-semibold text-[#666]">
                        {item.target.job ||
                          item.target.service_type ||
                          item.target.activity_sector ||
                          'Member'}
                        {item.target.city ? ` · ${item.target.city}` : ''}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            background: isMatched
                              ? matchyBrand.softBlue
                              : isLike
                                ? matchyBrand.softTeal
                                : '#F5F5F5',
                            color: isMatched
                              ? matchyBrand.blue
                              : isLike
                                ? matchyBrand.teal
                                : matchyBrand.muted,
                          }}
                        >
                          {isMatched
                            ? t('activityHistory.actionMatched')
                            : isLike
                              ? t('activityHistory.actionLiked')
                              : isSuperlike
                                ? t('activityHistory.actionSuperliked')
                                : t('activityHistory.actionPassed')}
                        </span>

                        <span className="text-[10px] text-[#AAA]">
                          {formatDate(item.swiped_at, locale)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setSelectedProfile(item.target)}
                      className="rounded-xl px-3 py-2 text-xs font-bold transition-all hover:bg-gray-100 active:scale-95"
                      style={{
                        border: `1px solid ${matchyBrand.border}`,
                        color: matchyBrand.textDark,
                      }}
                    >
                      {t('activityHistory.viewProfile')}
                    </button>

                    {isMatched && (
                      <button
                        type="button"
                        onClick={() => {
                          if (item.conversation_id) {
                            router.push(`/matches?c=${item.conversation_id}`);
                          } else {
                            router.push('/matches');
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:scale-105 active:scale-95"
                        style={{ background: matchyBrand.gradient }}
                      >
                        <MessageCircle size={13} />
                        <span>{t('activityHistory.openChat')}</span>
                      </button>
                    )}
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
            image: selectedProfile.image,
            bio: selectedProfile.bio,
            job: selectedProfile.job,
            category: selectedProfile.category,
            city: selectedProfile.city,
            interests: selectedProfile.interests || [],
            activity_sector: selectedProfile.activity_sector,
            service_type: selectedProfile.service_type,
            rating: selectedProfile.rating,
            distance_km: null,
            match_score: 85,
          }}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}
