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
} from '@/features/matching/store/matching-slice';
import type { MatchingProfile, SwipeHistoryItem } from '@/features/matching/types';
import { Eye, Heart, History, Loader2, SkipForward, Sparkles, Trash2, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type HistoryTab = 'all' | 'viewed' | 'connected' | 'match' | 'left';

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '';
  }
}

function getGroupHeader(iso: string, t: (key: string) => string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) return t('activityHistory.today');

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return t('activityHistory.yesterday');

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch {
    return '';
  }
}

export default function HistoryPage() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const isRtl = locale === 'ar';

  const rawItems = useAppSelector(selectSwipeHistory);
  const loading = useAppSelector(selectSwipeHistoryLoading);
  const error = useAppSelector(selectSwipeHistoryError);

  const [activeTab, setActiveTab] = useState<HistoryTab>('all');
  const [selectedProfile, setSelectedProfile] = useState<MatchingProfile | null>(null);

  useEffect(() => {
    dispatch(fetchSwipeHistory({ direction: 'all' }));
  }, [dispatch]);

  // Derived filter & counts
  const { filteredItems, counts } = useMemo(() => {
    const items = rawItems ?? [];

    const countsMap = {
      all: items.length,
      viewed: items.filter((i) => (i as SwipeHistoryItem & { is_viewed?: boolean }).is_viewed)
        .length,
      connected: items.filter((i) => i.direction === 'RIGHT' && !i.is_matched).length,
      match: items.filter((i) => i.is_matched).length,
      left: items.filter((i) => i.direction === 'LEFT').length,
    };

    let filtered = items;
    if (activeTab === 'viewed') {
      filtered = items.filter((i) => (i as SwipeHistoryItem & { is_viewed?: boolean }).is_viewed);
    } else if (activeTab === 'connected') {
      filtered = items.filter((i) => i.direction === 'RIGHT' && !i.is_matched);
    } else if (activeTab === 'match') {
      filtered = items.filter((i) => i.is_matched);
    } else if (activeTab === 'left') {
      filtered = items.filter((i) => i.direction === 'LEFT');
    }

    return { filteredItems: filtered, counts: countsMap };
  }, [rawItems, activeTab]);

  // Group items by date header (Today, Yesterday, DD/MM)
  const groupedItems = useMemo(() => {
    const groups: { header: string; items: SwipeHistoryItem[] }[] = [];
    for (const item of filteredItems) {
      const header = getGroupHeader(item.swiped_at, t);
      const existing = groups.find((g) => g.header === header);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ header, items: [item] });
      }
    }
    return groups;
  }, [filteredItems, t]);

  const tabs: { key: HistoryTab; label: string; count: number }[] = [
    { key: 'all', label: t('activityHistory.tabAll'), count: counts.all },
    { key: 'viewed', label: t('activityHistory.tabViewed'), count: counts.viewed },
    { key: 'connected', label: t('activityHistory.tabConnected'), count: counts.connected },
    { key: 'match', label: t('activityHistory.tabMatches'), count: counts.match },
    { key: 'left', label: t('activityHistory.tabSkipped'), count: counts.left },
  ];

  return (
    <div className="min-h-full w-full bg-[#F8FAFC] px-4 py-6 md:px-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full space-y-6">
        {/* Top Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#2F76BB] text-white shadow-xs'
                    : 'border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F1F5F9]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && rawItems.length === 0 && (
          <div className="flex items-center justify-center py-20 text-[#64748B]">
            <Loader2 className="h-6 w-6 animate-spin text-[#2F76BB]" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-between rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-600">
            <span>{t('activityHistory.errorLoading')}</span>
            <button
              type="button"
              onClick={() => dispatch(fetchSwipeHistory({ direction: 'all' }))}
              className="underline hover:no-underline"
            >
              {t('activityHistory.retry')}
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EBF5FB]">
              <History size={24} className="text-[#2F76BB]" />
            </div>
            <h3 className="text-base font-extrabold text-[#1E293B]">
              {activeTab === 'viewed'
                ? t('activityHistory.emptyTitle')
                : activeTab === 'connected'
                  ? t('activityHistory.emptyLikesTitle')
                  : activeTab === 'match'
                    ? t('activityHistory.emptyMatchesTitle')
                    : activeTab === 'left'
                      ? t('activityHistory.emptyPassesTitle')
                      : t('activityHistory.emptyTitle')}
            </h3>
            <p className="mt-1 text-xs font-medium text-[#94A3B8]">
              {activeTab === 'connected'
                ? t('activityHistory.emptyLikesDesc')
                : activeTab === 'match'
                  ? t('activityHistory.emptyMatchesDesc')
                  : activeTab === 'left'
                    ? t('activityHistory.emptyPassesDesc')
                    : t('activityHistory.emptyDesc')}
            </p>
          </div>
        )}

        {/* Grouped History List */}
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <div key={group.header} className="space-y-2">
              {/* Group Date Title + Separator Line */}
              <div className="flex items-center gap-3">
                <h2 className="shrink-0 text-xs font-bold text-[#64748B]">{group.header}</h2>
                <div className="h-[1px] flex-1 bg-[#E2E8F0]" />
              </div>

              {/* Group Card Container (All items in same card) */}
              <div className="w-full divide-y divide-[#F1F5F9] overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-xs">
                {group.items.map((item) => {
                  const isMatched = item.is_matched;
                  const isConnected = item.direction === 'RIGHT' && !isMatched;
                  const isSkipped = item.direction === 'LEFT';
                  const isViewed = Boolean(
                    (item as SwipeHistoryItem & { is_viewed?: boolean }).is_viewed,
                  );

                  const profileName = item.target.name;
                  const role =
                    item.target.job ||
                    item.target.service_type ||
                    item.target.activity_sector ||
                    '';

                  const actionConfig = isMatched
                    ? {
                        label: t('activityHistory.actionMatched'),
                        badgeBg: 'bg-[#FFF8EB]',
                        icon: <Zap size={10} className="fill-[#D97706] text-[#D97706]" />,
                        pillClass:
                          'rounded-full bg-[#FFF8EB] px-2.5 py-0.5 text-[11px] font-bold text-[#D97706]',
                      }
                    : isConnected
                      ? {
                          label: t('activityHistory.actionConnectionSent'),
                          badgeBg: 'bg-[#E8F7F3]',
                          icon: <Heart size={10} className="text-[#2A9177]" />,
                          pillClass:
                            'rounded-full bg-[#E8F7F3] px-2.5 py-0.5 text-[11px] font-bold text-[#2A9177]',
                        }
                      : isViewed
                        ? {
                            label: t('activityHistory.actionViewed'),
                            badgeBg: 'bg-[#EEF5FF]',
                            icon: <Eye size={10} className="text-[#2F76BB]" />,
                            pillClass:
                              'rounded-full bg-[#EEF5FF] px-2.5 py-0.5 text-[11px] font-bold text-[#2F76BB]',
                          }
                        : isSkipped
                          ? {
                              label: t('activityHistory.actionSkipped'),
                              badgeBg: 'bg-[#F1F5F9]',
                              icon: <SkipForward size={10} className="text-[#64748B]" />,
                              pillClass:
                                'rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-bold text-[#64748B]',
                            }
                          : {
                              label: t('activityHistory.actionLiked'),
                              badgeBg: 'bg-[#E8F7F3]',
                              icon: <Heart size={10} className="text-[#2A9177]" />,
                              pillClass:
                                'rounded-full bg-[#E8F7F3] px-2.5 py-0.5 text-[11px] font-bold text-[#2A9177]',
                            };

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedProfile(item.target)}
                      className="flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors hover:bg-[#FAFCFF]"
                    >
                      {/* Left: Avatar + Details */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative shrink-0">
                          {item.target.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.target.image}
                              alt={profileName}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF5FB] text-sm font-bold text-[#2F76BB]">
                              {profileName.charAt(0)}
                            </div>
                          )}

                          {/* Action Icon Badge on Avatar */}
                          <span
                            className={`absolute -right-0.5 -bottom-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-white shadow-2xs ${actionConfig.badgeBg}`}
                          >
                            {actionConfig.icon}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-xs font-bold text-[#1E293B]">
                            {profileName}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className={actionConfig.pillClass}>{actionConfig.label}</span>

                            {role && (
                              <>
                                <span className="text-[#CBD5E1]">·</span>
                                <span className="truncate text-xs text-[#64748B]">{role}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Timestamp */}
                      <div className="shrink-0 text-right text-[11px] font-semibold text-[#94A3B8]">
                        {formatTime(item.swiped_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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
