'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { LanguageSwitcher } from '@/components/matchy/language-switcher';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import {
  fetchNotifications,
  selectNotifications,
} from '@/features/notifications/store/notifications-slice';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function MatchyHeaderActions() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const notificationsState = useAppSelector(selectNotifications);
  const unreadCount = notificationsState?.unreadCount ?? 0;

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  return (
    <div className="flex items-center gap-2">
      <LanguageSwitcher />
      <button
        type="button"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100"
        style={{ background: '#F5F7FA', border: '1px solid #E0E0E0' }}
        onClick={() => router.push('/notifications')}
        aria-label="Notifications"
      >
        <Bell size={18} color="#5C5C5C" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm"
            style={{ background: matchyBrand.blue }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
