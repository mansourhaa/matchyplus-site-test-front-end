'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  fetchNotificationPreferences,
  selectNotifications,
  updateNotificationPreferences,
} from '@/features/notifications/store/notifications-slice';
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesBody,
} from '@/features/notifications/types';
import {
  Bell,
  ChevronLeft,
  Eye,
  Heart,
  Info,
  Mail,
  MessageCircle,
  // Smartphone,
  // Tag,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

export function NotificationPreferencesView() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';

  const { preferences } = useAppSelector(selectNotifications);

  useEffect(() => {
    void dispatch(fetchNotificationPreferences());
  }, [dispatch]);

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    const body: UpdateNotificationPreferencesBody = { [key]: value };
    void dispatch(updateNotificationPreferences(body));
  };

  // Dynamic backend-backed preference states
  const isAllEnabled = preferences?.all_enabled ?? true;
  const isMatchesEnabled = preferences?.matches ?? true;
  const isMessagesEnabled = preferences?.messages ?? true;
  const isViewsEnabled = preferences?.views ?? true;
  const isEmailEnabled = preferences?.email ?? true;

  // Active functional service count (In-app categories are active only if master toggle is ON)
  const activeMatches = isAllEnabled && isMatchesEnabled;
  const activeMessages = isAllEnabled && isMessagesEnabled;
  const activeViews = isAllEnabled && isViewsEnabled;
  const activeEmail = isEmailEnabled;

  const activeServicesCount = [activeMatches, activeMessages, activeViews, activeEmail].filter(
    Boolean,
  ).length;

  const totalServicesCount = 4;

  const activeCountLabel = t('notificationSettings.activeCount')
    .replace('{active}', String(activeServicesCount))
    .replace('{total}', String(totalServicesCount));

  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }} dir={dir}>
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-6 md:px-6">
        {/* Top Back Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-base font-bold text-[#1E293B] transition-colors hover:text-[#2F76BB]"
          >
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
            <span>{t('notificationSettings.back')}</span>
          </button>
        </div>

        {/* Active Count Banner Card */}
        <div
          className="relative flex items-center gap-4 overflow-hidden rounded-3xl p-5 text-white shadow-md"
          style={{
            background: 'linear-gradient(135deg, #2F76BB 0%, #61BCA6 100%)',
          }}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs">
            <Bell size={24} color="white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold tracking-tight text-white">{activeCountLabel}</h2>
            <p className="text-xs text-white/90">{t('notificationSettings.activeServices')}</p>
          </div>
        </div>

        {/* Preference Toggles Card */}
        <div
          className="divide-y divide-[#F2F4F7] overflow-hidden rounded-3xl bg-white shadow-xs"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          {/* 1. All Notifications (Master) — DYNAMIC */}
          <div className="flex items-center justify-between gap-4 p-4.5 transition-colors hover:bg-[#FAFCFF]">
            <div className="flex min-w-0 items-center gap-3.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: '#EBF5FB' }}
              >
                <Bell size={18} color="#2F76BB" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1E293B]">
                  {t('notificationSettings.allNotifications')}
                </p>
                <p className="text-xs text-[#64748B]">
                  {t('notificationSettings.allNotificationsDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isAllEnabled}
              onClick={() => handleToggle('all_enabled', !isAllEnabled)}
              className="relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none"
              style={{ background: isAllEnabled ? '#2F76BB' : '#CBD5E1' }}
              dir="ltr"
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform"
                style={{
                  transform: isAllEnabled ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          {/* 2. Push Notifications — COMING SOON (Hidden/Commented) */}
          {/*
          <div className="flex items-center justify-between gap-4 p-4.5 opacity-65 bg-[#FAFAFC]">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100"
              >
                <Smartphone size={18} color="#94A3B8" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#1E293B]">
                    {t('notificationSettings.pushNotifications')}
                  </p>
                  <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {t('notificationSettings.comingSoon')}
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">
                  {t('notificationSettings.pushNotificationsDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={false}
              disabled
              aria-disabled="true"
              className="relative h-6 w-11 shrink-0 rounded-full cursor-not-allowed opacity-50 focus:outline-none"
              style={{ background: '#CBD5E1' }}
              dir="ltr"
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform"
                style={{ transform: 'translateX(0)' }}
              />
            </button>
          </div>
          */}

          {/* 2. New Matches — DYNAMIC */}
          <div
            className={`flex items-center justify-between gap-4 p-4.5 transition-colors hover:bg-[#FAFCFF] ${
              !isAllEnabled ? 'opacity-50' : ''
            }`}
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: isMatchesEnabled ? '#FDEAEA' : '#F1F5F9' }}
              >
                <Heart size={18} color={isMatchesEnabled ? '#E05656' : '#94A3B8'} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1E293B]">
                  {t('notificationSettings.newMatches')}
                </p>
                <p className="text-xs text-[#64748B]">{t('notificationSettings.newMatchesDesc')}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isMatchesEnabled}
              onClick={() => handleToggle('matches', !isMatchesEnabled)}
              className="relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none"
              style={{ background: isMatchesEnabled ? '#E05656' : '#CBD5E1' }}
              dir="ltr"
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform"
                style={{
                  transform: isMatchesEnabled ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          {/* 3. New Messages — DYNAMIC */}
          <div
            className={`flex items-center justify-between gap-4 p-4.5 transition-colors hover:bg-[#FAFCFF] ${
              !isAllEnabled ? 'opacity-50' : ''
            }`}
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: isMessagesEnabled ? '#EDF8F5' : '#F1F5F9' }}
              >
                <MessageCircle size={18} color={isMessagesEnabled ? '#61BCA6' : '#94A3B8'} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1E293B]">
                  {t('notificationSettings.newMessages')}
                </p>
                <p className="text-xs text-[#64748B]">
                  {t('notificationSettings.newMessagesDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isMessagesEnabled}
              onClick={() => handleToggle('messages', !isMessagesEnabled)}
              className="relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none"
              style={{ background: isMessagesEnabled ? '#61BCA6' : '#CBD5E1' }}
              dir="ltr"
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform"
                style={{
                  transform: isMessagesEnabled ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          {/* 4. Profile Views — DYNAMIC */}
          <div
            className={`flex items-center justify-between gap-4 p-4.5 transition-colors hover:bg-[#FAFCFF] ${
              !isAllEnabled ? 'opacity-50' : ''
            }`}
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: isViewsEnabled ? '#F5EDF9' : '#F1F5F9' }}
              >
                <Eye size={18} color={isViewsEnabled ? '#9B59B6' : '#94A3B8'} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1E293B]">
                  {t('notificationSettings.profileViews')}
                </p>
                <p className="text-xs text-[#64748B]">
                  {t('notificationSettings.profileViewsDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isViewsEnabled}
              onClick={() => handleToggle('views', !isViewsEnabled)}
              className="relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none"
              style={{ background: isViewsEnabled ? '#9B59B6' : '#CBD5E1' }}
              dir="ltr"
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform"
                style={{
                  transform: isViewsEnabled ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          {/* 5. Promotions & Offers — COMING SOON (Hidden/Commented) */}
          {/*
          <div className="flex items-center justify-between gap-4 p-4.5 opacity-65 bg-[#FAFAFC]">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100"
              >
                <Tag size={18} color="#94A3B8" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#1E293B]">
                    {t('notificationSettings.promotionsOffers')}
                  </p>
                  <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {t('notificationSettings.comingSoon')}
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">
                  {t('notificationSettings.promotionsOffersDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={false}
              disabled
              aria-disabled="true"
              className="relative h-6 w-11 shrink-0 rounded-full cursor-not-allowed opacity-50 focus:outline-none"
              style={{ background: '#CBD5E1' }}
              dir="ltr"
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform"
                style={{ transform: 'translateX(0)' }}
              />
            </button>
          </div>
          */}

          {/* 5. Email Notifications — DYNAMIC */}
          <div className="flex items-center justify-between gap-4 p-4.5 transition-colors hover:bg-[#FAFCFF]">
            <div className="flex min-w-0 items-center gap-3.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: isEmailEnabled ? '#E2E8F0' : '#F1F5F9' }}
              >
                <Mail size={18} color={isEmailEnabled ? '#475569' : '#94A3B8'} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1E293B]">
                  {t('notificationSettings.emailNotifications')}
                </p>
                <p className="text-xs text-[#64748B]">
                  {t('notificationSettings.emailNotificationsDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isEmailEnabled}
              onClick={() => handleToggle('email', !isEmailEnabled)}
              className="relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none"
              style={{ background: isEmailEnabled ? '#475569' : '#CBD5E1' }}
              dir="ltr"
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform"
                style={{
                  transform: isEmailEnabled ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>
        </div>

        {/* Bottom Device Notice Banner */}
        {/* <div
          className="flex items-center gap-3 rounded-2xl p-4 shadow-xs"
          style={{ background: '#EBF5FB', border: '1px solid #D4E9F7' }}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D4E9F7]">
            <Info size={16} color="#2F76BB" />
          </div>
          <p className="text-xs font-medium text-[#2F76BB] leading-relaxed">
            {t('notificationSettings.deviceNotice')}
          </p>
        </div> */}
      </div>
    </div>
  );
}
