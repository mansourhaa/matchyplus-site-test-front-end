'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectNotifications,
} from '@/features/notifications/store/notifications-slice';
import type { NotificationItem } from '@/features/notifications/types';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { formatDistanceToNow } from 'date-fns';
import { arSA, enUS, fr } from 'date-fns/locale';
import { Bell, CheckCheck, Eye, Heart, Loader2, MessageCircle, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const DATE_LOCALES: Record<Locale, typeof fr> = {
  en: enUS,
  fr: fr,
  ar: arSA,
};

function getPushCopy(
  item: NotificationItem,
  locale: Locale,
  isFree = true,
): { title: string; body: React.ReactNode } {
  switch (item.type) {
    case 'PROFILE_VIEW': {
      const rawName = item.data.viewerName || '';
      const displayName = isFree ? rawName.trim().split(/\s+/)[0] || rawName : rawName;
      return {
        title:
          locale === 'en'
            ? 'Profile view'
            : locale === 'ar'
              ? 'زيارة للملف الشخصي'
              : 'Vue de profil',
        body: displayName ? (
          locale === 'en' ? (
            <>
              Someone named <strong className="font-bold text-[#0F172A]">{displayName}</strong>{' '}
              viewed your profile.
            </>
          ) : locale === 'ar' ? (
            <>
              قام شخص باسم <strong className="font-bold text-[#0F172A]">{displayName}</strong>{' '}
              بزيارة ملفك الشخصي.
            </>
          ) : (
            <>
              Quelqu&apos;un nommé{' '}
              <strong className="font-bold text-[#0F172A]">{displayName}</strong> a consulté votre
              profil.
            </>
          )
        ) : locale === 'en' ? (
          'Someone viewed your profile.'
        ) : locale === 'ar' ? (
          'قام شخص بزيارة ملفك الشخصي.'
        ) : (
          "Quelqu'un a consulté votre profil."
        ),
      };
    }
    case 'MATCH':
      return {
        title: locale === 'en' ? 'New Match!' : locale === 'ar' ? 'مطابقة جديدة!' : 'Nouveau match',
        body:
          item.data.body ||
          (locale === 'en'
            ? 'It’s a match! Open your matches to start chatting.'
            : locale === 'ar'
              ? 'إنها مطابقة! افتح التوافقات لبدء المحادثة.'
              : 'Nouveau match ! Ouvrez vos matches pour continuer.'),
      };
    case 'MATCH_REQUEST': {
      const rawName = item.data.actor_first_name || '';
      const displayName = isFree ? rawName.trim().split(/\s+/)[0] || rawName : rawName;
      return {
        title:
          item.data.title ||
          (locale === 'en' ? 'Match request' : locale === 'ar' ? 'طلب مطابقة' : 'Demande de match'),
        body: displayName ? (
          locale === 'en' ? (
            <>
              <strong className="font-bold text-[#0F172A]">{displayName}</strong> sent you a match
              request.
            </>
          ) : locale === 'ar' ? (
            <>
              أرسل لك <strong className="font-bold text-[#0F172A]">{displayName}</strong> طلب
              مطابقة.
            </>
          ) : (
            <>
              <strong className="font-bold text-[#0F172A]">{displayName}</strong> vous a envoyé une
              demande de match.
            </>
          )
        ) : (
          item.data.body ||
          (locale === 'en'
            ? 'Someone sent you a match request.'
            : locale === 'ar'
              ? 'أرسل لك شخص طلب مطابقة.'
              : 'Quelqu’un vous a envoyé une demande de match.')
        ),
      };
    }
    case 'MESSAGE':
      return {
        title:
          locale === 'en' ? 'New Message' : locale === 'ar' ? 'رسالة جديدة' : 'Nouveau message',
        body: (
          <>
            <strong className="font-bold text-[#0F172A]">{item.data.sender_name}</strong>:{' '}
            {item.data.preview}
          </>
        ),
      };
  }
}

function avatarSrc(item: NotificationItem): string | null {
  switch (item.type) {
    case 'PROFILE_VIEW':
      return item.data.viewerImage;
    case 'MATCH':
      return item.data.actor_image ?? null;
    case 'MATCH_REQUEST':
      return item.data.sender_picture;
    case 'MESSAGE':
      return item.data.sender_image;
  }
}

function getNotificationActionConfig(item: NotificationItem) {
  switch (item.type) {
    case 'MATCH':
      return {
        badgeBg: 'bg-[#FFF8EB]',
        avatarBg: '#FFF8EB',
        icon: <Zap size={10} className="fill-[#D97706] text-[#D97706]" />,
        avatarIcon: <Zap size={18} className="fill-[#D97706] text-[#D97706]" />,
        pillClass: 'rounded-full bg-[#FFF8EB] px-2.5 py-0.5 text-[11px] font-bold text-[#D97706]',
      };
    case 'MATCH_REQUEST':
      return {
        badgeBg: 'bg-[#E8F7F3]',
        avatarBg: '#E8F7F3',
        icon: <Heart size={10} className="fill-[#2A9177] text-[#2A9177]" />,
        avatarIcon: <Heart size={18} className="fill-[#2A9177] text-[#2A9177]" />,
        pillClass: 'rounded-full bg-[#E8F7F3] px-2.5 py-0.5 text-[11px] font-bold text-[#2A9177]',
      };
    case 'PROFILE_VIEW':
      return {
        badgeBg: 'bg-[#EEF5FF]',
        avatarBg: '#EEF5FF',
        icon: <Eye size={10} className="text-[#2F76BB]" />,
        avatarIcon: <Eye size={18} className="text-[#2F76BB]" />,
        pillClass: 'rounded-full bg-[#EEF5FF] px-2.5 py-0.5 text-[11px] font-bold text-[#2F76BB]',
      };
    case 'MESSAGE':
      return {
        badgeBg: 'bg-[#EBF5FB]',
        avatarBg: '#EBF5FB',
        icon: <MessageCircle size={10} className="text-[#2F76BB]" />,
        avatarIcon: <MessageCircle size={18} className="text-[#2F76BB]" />,
        pillClass: 'rounded-full bg-[#EBF5FB] px-2.5 py-0.5 text-[11px] font-bold text-[#2F76BB]',
      };
  }
}

function getActorInitial(item: NotificationItem): string {
  const name =
    item.type === 'PROFILE_VIEW'
      ? item.data.viewerName
      : item.type === 'MATCH'
        ? item.data.actor_name
        : item.type === 'MATCH_REQUEST'
          ? item.data.actor_first_name
          : item.data.sender_name;
  return name?.trim().charAt(0)?.toUpperCase() || '';
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { locale } = useI18n();
  const authUser = useAppSelector((state) => state.auth?.user);
  const isFree = !authUser?.plan || authUser.plan.toUpperCase() === 'FREE';
  const shouldBlurImage =
    isFree &&
    (item.type === 'PROFILE_VIEW' || item.type === 'MATCH' || item.type === 'MATCH_REQUEST');

  const avatar = useAuthenticatedMediaUrl(avatarSrc(item));
  const { title, body } = getPushCopy(item, locale, isFree);
  const isRtl = locale === 'ar';
  const actionConfig = getNotificationActionConfig(item);
  const initial = getActorInitial(item);

  const handleClick = async () => {
    if (!item.read) {
      const result = await dispatch(markNotificationRead(item.id));
      if (markNotificationRead.fulfilled.match(result)) {
        void dispatch(fetchNotifications());
      }
    }

    if (item.type === 'MATCH' || item.type === 'MATCH_REQUEST') {
      router.push('/matches');
      return;
    }
    if (item.type === 'MESSAGE') {
      router.push(`/chat/${item.data.conversation_id}`);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={`flex w-full items-start gap-3 p-3.5 transition-colors hover:bg-slate-50 ${
        !item.read ? 'bg-[#F4F9FF]' : 'bg-white'
      } ${isRtl ? 'text-right' : 'text-left'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative shrink-0">
        {avatar.url ? (
          <div
            className="relative h-10 w-10 overflow-hidden rounded-full shadow-xs"
            style={{ border: '1px solid #DCE7F2' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar.url}
              alt=""
              className={`h-full w-full object-cover ${shouldBlurImage ? 'scale-125' : ''}`}
              style={{ filter: shouldBlurImage ? 'blur(5px)' : undefined }}
            />
          </div>
        ) : initial ? (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EBF5FB] text-sm font-bold text-[#2F76BB] shadow-xs"
            style={{ border: '1px solid #DCE7F2' }}
          >
            {initial}
          </div>
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full shadow-xs"
            style={{ background: actionConfig.avatarBg }}
          >
            {actionConfig.avatarIcon}
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
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 ${actionConfig.pillClass}`}>
            {actionConfig.icon}
            <span>{title}</span>
          </span>
          <span className="shrink-0 text-[11px] text-[#94A3B8]">
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: false,
              locale: DATE_LOCALES[locale] || fr,
            })}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{body}</p>
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
  const router = useRouter();
  const { t, locale, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const { items, unreadCount, loading, error } = useAppSelector(selectNotifications);

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  const handleMarkAllRead = async () => {
    const result = await dispatch(markAllNotificationsRead());
    if (markAllNotificationsRead.fulfilled.match(result)) {
      void dispatch(fetchNotifications());
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/home');
    }
  };

  return (
    <div className="min-h-full bg-[#F5F7FA]" dir={dir}>
      {/* Main Container */}
      <main className="w-full px-4 py-6 md:px-8">
        {/* Latest Notifications Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          {/* Card Title Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <h2 className="text-xs font-bold text-[#1A1A2E]">
              {locale === 'en'
                ? 'Latest notifications'
                : locale === 'ar'
                  ? 'أحدث الإشعارات'
                  : 'Dernières notifications'}
            </h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2F76BB] hover:underline"
              >
                <CheckCheck size={14} />
                <span>
                  {locale === 'en'
                    ? 'Mark all as read'
                    : locale === 'ar'
                      ? 'تحديد الكل كمقروء'
                      : 'Tout marquer comme lu'}
                </span>
              </button>
            )}
          </div>

          {/* Card Body */}
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-14 text-[#64748B]">
              <Loader2 className="h-7 w-7 animate-spin text-[#2F76BB]" />
              <p className="text-xs font-medium">{t('common.loading') || 'Loading...'}</p>
            </div>
          ) : error && items.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-bold text-[#E24E59]">
                {locale === 'en'
                  ? 'Unable to load notifications.'
                  : locale === 'ar'
                    ? 'تعذر تحميل الإشعارات.'
                    : 'Impossible de charger vos notifications.'}
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EBF5FB]">
                <Bell size={24} className="text-[#2F76BB]" />
              </div>
              <h3 className="text-base font-extrabold text-[#1E293B]">
                {locale === 'en'
                  ? 'No notifications yet'
                  : locale === 'ar'
                    ? 'لا توجد إشعارات بعد'
                    : 'Aucune notification pour le moment'}
              </h3>
              <p className="mt-1 text-xs font-medium text-[#94A3B8]">
                {locale === 'en'
                  ? 'New matches, profile views, and messages will appear here'
                  : locale === 'ar'
                    ? 'ستظهر التطابقات الجديدة وزيارات الملف والرسائل هنا'
                    : 'Vos nouveaux matchs, vues de profil et messages apparaîtront ici'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
