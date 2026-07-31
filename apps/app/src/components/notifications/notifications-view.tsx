'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectNotifications,
} from '@/features/notifications/store/notifications-slice';
import type { NotificationItem } from '@/features/notifications/types';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, Eye, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const PROFILE_VIEW_TINT = '#9B59B6';

function pushCopy(item: NotificationItem): { title: string; body: string } {
  if (item.type === 'PROFILE_VIEW') {
    return {
      title: 'Vue de profil',
      body: `Quelqu'un nommé "${item.data.viewerName}" a consulté votre profil.`,
    };
  }
  return { title: 'Nouvelle notification', body: '' };
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const dispatch = useAppDispatch();
  const avatar = useAuthenticatedMediaUrl(
    item.type === 'PROFILE_VIEW' ? item.data.viewerImage : null,
  );
  const { title, body } = pushCopy(item);

  return (
    <button
      type="button"
      onClick={() => {
        if (!item.read) void dispatch(markNotificationRead(item.id));
      }}
      className="flex w-full items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm"
      style={{ border: `1px solid ${item.read ? matchyBrand.border : matchyBrand.blue}` }}
    >
      {avatar.url ? (
        <div
          className="h-10 w-10 shrink-0 overflow-hidden rounded-full"
          style={{ border: '1px solid #DCE7F2' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar.url}
            alt=""
            className="h-full w-full object-cover"
            style={{ filter: 'blur(3px)' }}
          />
        </div>
      ) : (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${PROFILE_VIEW_TINT}1A` }}
        >
          <Eye size={17} color={PROFILE_VIEW_TINT} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm"
          style={{ color: matchyBrand.textDark, fontWeight: item.read ? 500 : 700 }}
        >
          {title}
        </p>
        <p className="mt-0.5 text-xs text-[#777]">{body}</p>
        <p className="mt-1 text-xs text-[#999]">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}
        </p>
      </div>
      {!item.read && (
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: matchyBrand.blue }}
        />
      )}
    </button>
  );
}

export function NotificationsView() {
  const dispatch = useAppDispatch();
  const { items, unreadCount, loading, error } = useAppSelector(selectNotifications);

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }}>
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 md:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold" style={{ color: matchyBrand.textDark }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void dispatch(markAllNotificationsRead())}
              className="text-xs font-bold"
              style={{ color: matchyBrand.blue }}
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-[#777]">
            <Loader2 className="h-8 w-8 animate-spin text-[#61BCA6]" />
            <p>Chargement…</p>
          </div>
        ) : error ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-[#E24E59]">
            Impossible de charger vos notifications.
          </p>
        ) : items.length === 0 ? (
          <div
            className="rounded-3xl bg-white px-5 py-12 text-center"
            style={{ border: `1px solid ${matchyBrand.border}` }}
          >
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: matchyBrand.softBlue }}
            >
              <Bell size={28} color={matchyBrand.blue} />
            </div>
            <p className="font-bold" style={{ color: matchyBrand.textDark }}>
              Aucune notification pour l’instant
            </p>
            <p className="mt-2 text-sm text-[#777]">
              Vous serez prévenu ici dès qu’il se passe quelque chose.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <NotificationRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
