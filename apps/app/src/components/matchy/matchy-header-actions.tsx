'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import {
  fetchNotifications,
  selectNotifications,
} from '@/features/notifications/store/notifications-slice';
import { LangPickerLight } from '@/features/onboarding/components/lang-picker-light';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function MatchyHeaderActions() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const notificationsState = useAppSelector(selectNotifications);
  const unreadCount = notificationsState?.unreadCount ?? 0;
  const isNotificationsPage = pathname === '/notifications';

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  return (
    <div className="flex items-center gap-2">
      {/* 2.0.8 header: language flag + code (FR / EN / AR) */}
      <LangPickerLight showCode />
      <Link
        href="/notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100"
        style={{
          background: isNotificationsPage ? '#EBF5FB' : '#F5F7FA',
          border: `1px solid ${isNotificationsPage ? matchyBrand.blue : '#E0E0E0'}`,
        }}
        aria-label="Notifications"
      >
        <Bell size={18} color={isNotificationsPage ? matchyBrand.blue : '#5C5C5C'} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm"
            style={{ background: matchyBrand.blue }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}
