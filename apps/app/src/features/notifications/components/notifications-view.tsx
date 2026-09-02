'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import {
  fetchNotificationPreferences,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectNotifications,
  updateNotificationPreferences,
} from '@/features/notifications/store/notifications-slice';
import type {
  NotificationItem,
  NotificationPreferences,
  UpdateNotificationPreferencesBody,
} from '@/features/notifications/types';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { formatDistanceToNow } from 'date-fns';
import { arSA, enUS, fr } from 'date-fns/locale';
import { Bell, Eye, Heart, Loader2, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PROFILE_VIEW_TINT = '#9B59B6';
const MATCH_TINT = '#E24E59';
const MESSAGE_TINT = '#2F76BB';

const DATE_LOCALES: Record<Locale, typeof fr> = {
  en: enUS,
  fr: fr,
  ar: arSA,
};

function getPushCopy(item: NotificationItem, locale: Locale): { title: string; body: string } {
  switch (item.type) {
    case 'PROFILE_VIEW':
      return {
        title:
          locale === 'en'
            ? 'Profile view'
            : locale === 'ar'
              ? 'زيارة للملف الشخصي'
              : 'Vue de profil',
        body:
          locale === 'en'
            ? `Someone named "${item.data.viewerName}" viewed your profile.`
            : locale === 'ar'
              ? `قام شخص باسم "${item.data.viewerName}" بزيارة ملفك الشخصي.`
              : `Quelqu'un nommé "${item.data.viewerName}" a consulté votre profil.`,
      };
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
    case 'MATCH_REQUEST':
      return {
        title:
          item.data.title ||
          (locale === 'en' ? 'Match request' : locale === 'ar' ? 'طلب مطابقة' : 'Demande de match'),
        body:
          item.data.body ||
          (locale === 'en'
            ? `${item.data.actor_first_name} sent you a match request.`
            : locale === 'ar'
              ? `أرسل لك ${item.data.actor_first_name} طلب مطابقة.`
              : `${item.data.actor_first_name} vous a envoyé une demande de match.`),
      };
    case 'MESSAGE':
      return {
        title:
          locale === 'en' ? 'New Message' : locale === 'ar' ? 'رسالة جديدة' : 'Nouveau message',
        body: `${item.data.sender_name}: ${item.data.preview}`,
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

function TypeIcon({ item }: { item: NotificationItem }) {
  if (item.type === 'MESSAGE') {
    return <MessageCircle size={17} color={MESSAGE_TINT} />;
  }
  if (item.type === 'MATCH' || item.type === 'MATCH_REQUEST') {
    return <Heart size={17} color={MATCH_TINT} />;
  }
  return <Eye size={17} color={PROFILE_VIEW_TINT} />;
}

function iconBg(item: NotificationItem): string {
  if (item.type === 'MESSAGE') return `${MESSAGE_TINT}1A`;
  if (item.type === 'MATCH' || item.type === 'MATCH_REQUEST') return `${MATCH_TINT}1A`;
  return `${PROFILE_VIEW_TINT}1A`;
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { locale } = useI18n();
  const avatar = useAuthenticatedMediaUrl(avatarSrc(item));
  const { title, body } = getPushCopy(item, locale);
  const isRtl = locale === 'ar';

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
      className={`flex w-full items-start gap-3 rounded-2xl bg-white p-3 shadow-sm ${isRtl ? 'text-right' : 'text-left'}`}
      style={{ border: `1px solid ${item.read ? matchyBrand.border : matchyBrand.blue}` }}
      dir={isRtl ? 'rtl' : 'ltr'}
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
            style={{ filter: item.type === 'PROFILE_VIEW' ? 'blur(3px)' : undefined }}
          />
        </div>
      ) : (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: iconBg(item) }}
        >
          <TypeIcon item={item} />
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
          {formatDistanceToNow(new Date(item.created_at), {
            addSuffix: true,
            locale: DATE_LOCALES[locale] || fr,
          })}
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

const PREF_LABELS: Record<keyof NotificationPreferences, { en: string; fr: string; ar: string }> = {
  all_enabled: {
    en: 'All notifications',
    fr: 'Toutes les notifications',
    ar: 'جميع الإشعارات',
  },
  matches: {
    en: 'Matches & requests',
    fr: 'Matches et demandes',
    ar: 'المطابقات والطلبات',
  },
  messages: {
    en: 'Messages',
    fr: 'Messages',
    ar: 'الرسائل',
  },
  views: {
    en: 'Profile views',
    fr: 'Vues de profil',
    ar: 'زيارات الملف الشخصي',
  },
  email: {
    en: 'Emails',
    fr: 'Emails',
    ar: 'البريد الإلكتروني',
  },
};

const PREF_KEYS: (keyof NotificationPreferences)[] = [
  'all_enabled',
  'matches',
  'messages',
  'views',
  'email',
];

function PreferencesSection() {
  const dispatch = useAppDispatch();
  const { locale } = useI18n();
  const isRtl = locale === 'ar';
  const { preferences, preferencesLoading, preferencesError } = useAppSelector(selectNotifications);

  const toggle = (key: keyof NotificationPreferences, value: boolean) => {
    const body: UpdateNotificationPreferencesBody = { [key]: value };
    void dispatch(updateNotificationPreferences(body));
  };

  return (
    <div
      className="space-y-3 rounded-2xl bg-white p-4 shadow-xs"
      style={{ border: `1px solid ${matchyBrand.border}` }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <p className="text-sm font-bold" style={{ color: matchyBrand.textDark }}>
        {locale === 'en' ? 'Preferences' : locale === 'ar' ? 'التفضيلات' : 'Préférences'}
      </p>
      {preferencesLoading && !preferences ? (
        <p className="text-xs text-[#777]">
          {locale === 'en'
            ? 'Loading preferences...'
            : locale === 'ar'
              ? 'جارٍ تحميل التفضيلات...'
              : 'Chargement des préférences…'}
        </p>
      ) : preferencesError && !preferences ? (
        <p className="text-xs text-[#E24E59]">
          {locale === 'en'
            ? 'Unable to load preferences.'
            : locale === 'ar'
              ? 'تعذر تحميل التفضيلات.'
              : 'Impossible de charger les préférences.'}
        </p>
      ) : preferences ? (
        <ul className="space-y-3">
          {PREF_KEYS.map((key) => (
            <li key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: matchyBrand.textDark }}>
                {PREF_LABELS[key][locale] || PREF_LABELS[key].fr}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={preferences[key]}
                onClick={() => toggle(key, !preferences[key])}
                className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                style={{
                  background: preferences[key] ? matchyBrand.blue : '#D0D5DD',
                }}
                dir="ltr"
              >
                <span
                  className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                  style={{
                    transform: preferences[key] ? 'translateX(20px)' : 'translateX(0)',
                  }}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function NotificationsView() {
  const dispatch = useAppDispatch();
  const { locale } = useI18n();
  const isRtl = locale === 'ar';
  const { items, unreadCount, loading, error } = useAppSelector(selectNotifications);

  useEffect(() => {
    void dispatch(fetchNotifications());
    void dispatch(fetchNotificationPreferences());
  }, [dispatch]);

  const handleMarkAllRead = async () => {
    const result = await dispatch(markAllNotificationsRead());
    if (markAllNotificationsRead.fulfilled.match(result)) {
      void dispatch(fetchNotifications());
    }
  };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: matchyBrand.bg }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 md:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold" style={{ color: matchyBrand.textDark }}>
            {locale === 'en' ? 'Notifications' : locale === 'ar' ? 'الإشعارات' : 'Notifications'}
          </h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              className="text-xs font-bold"
              style={{ color: matchyBrand.blue }}
            >
              {locale === 'en'
                ? 'Mark all as read'
                : locale === 'ar'
                  ? 'تحديد الكل كمقروء'
                  : 'Tout marquer comme lu'}
            </button>
          )}
        </div>

        <PreferencesSection />

        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-[#777]">
            <Loader2 className="h-8 w-8 animate-spin text-[#61BCA6]" />
            <p>
              {locale === 'en' ? 'Loading...' : locale === 'ar' ? 'جارٍ التحميل...' : 'Chargement…'}
            </p>
          </div>
        ) : error && items.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-[#E24E59]">
            {locale === 'en'
              ? 'Unable to load your notifications.'
              : locale === 'ar'
                ? 'تعذر تحميل الإشعارات الخاصة بك.'
                : 'Impossible de charger vos notifications.'}
          </p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm font-medium text-[#64748B]">
            {locale === 'en'
              ? 'No notifications yet'
              : locale === 'ar'
                ? 'لا توجد إشعارات حالياً'
                : 'Aucune notification pour l’instant'}
          </p>
        ) : (
          <div className="space-y-2">
            {error && (
              <p className="rounded-xl bg-[#FFF0F0] px-4 py-2 text-center text-xs text-[#E24E59]">
                {locale === 'en'
                  ? 'Unable to refresh notifications. Displaying cached list.'
                  : locale === 'ar'
                    ? 'تعذر تحديث الإشعارات. يتم عرض القائمة المحفوظة.'
                    : 'Impossible d’actualiser vos notifications. Affichage de la dernière liste connue.'}
              </p>
            )}
            {items.map((item) => (
              <NotificationRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
