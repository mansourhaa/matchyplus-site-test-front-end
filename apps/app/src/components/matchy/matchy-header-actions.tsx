'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { NotificationsDropdown } from '@/features/notifications/components/notifications-dropdown';
import {
  fetchNotifications,
  selectNotifications,
} from '@/features/notifications/store/notifications-slice';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';

export function MatchyHeaderActions() {
  const dispatch = useAppDispatch();
  const notificationsState = useAppSelector(selectNotifications);
  const unreadCount = notificationsState?.unreadCount ?? 0;
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100"
          style={{
            background: isNotificationsOpen ? '#EBF5FB' : '#F5F7FA',
            border: `1px solid ${isNotificationsOpen ? matchyBrand.blue : '#E0E0E0'}`,
          }}
          onClick={() => setIsNotificationsOpen((prev) => !prev)}
          aria-label="Notifications"
          aria-expanded={isNotificationsOpen}
        >
          <Bell size={18} color={isNotificationsOpen ? matchyBrand.blue : '#5C5C5C'} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm"
              style={{ background: matchyBrand.blue }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <NotificationsDropdown
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />
      </div>
    </div>
  );
}
