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
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Settings,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef } from 'react';

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
        icon: <Zap size={9} className="fill-[#D97706] text-[#D97706]" />,
        avatarIcon: <Zap size={16} className="fill-[#D97706] text-[#D97706]" />,
        pillClass: 'rounded-full bg-[#FFF8EB] px-2 py-0.5 text-[10px] font-bold text-[#D97706]',
      };
    case 'MATCH_REQUEST':
      return {
        badgeBg: 'bg-[#E8F7F3]',
        avatarBg: '#E8F7F3',
        icon: <Heart size={9} className="fill-[#2A9177] text-[#2A9177]" />,
        avatarIcon: <Heart size={16} className="fill-[#2A9177] text-[#2A9177]" />,
        pillClass: 'rounded-full bg-[#E8F7F3] px-2 py-0.5 text-[10px] font-bold text-[#2A9177]',
      };
    case 'PROFILE_VIEW':
      return {
        badgeBg: 'bg-[#EEF5FF]',
        avatarBg: '#EEF5FF',
        icon: <Eye size={9} className="text-[#2F76BB]" />,
        avatarIcon: <Eye size={16} className="text-[#2F76BB]" />,
        pillClass: 'rounded-full bg-[#EEF5FF] px-2 py-0.5 text-[10px] font-bold text-[#2F76BB]',
      };
    case 'MESSAGE':
      return {
        badgeBg: 'bg-[#EBF5FB]',
        avatarBg: '#EBF5FB',
        icon: <MessageCircle size={9} className="text-[#2F76BB]" />,
        avatarIcon: <MessageCircle size={16} className="text-[#2F76BB]" />,
        pillClass: 'rounded-full bg-[#EBF5FB] px-2 py-0.5 text-[10px] font-bold text-[#2F76BB]',
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

function DropdownNotificationRow({
  item,
  onClose,
}: {
  item: NotificationItem;
  onClose: () => void;
}) {
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
    onClose();
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
      className={`flex w-full items-start gap-3 p-3 transition-colors hover:bg-[#F8FAFC] ${
        !item.read ? 'bg-[#F4F9FF]' : 'bg-white'
      } ${isRtl ? 'text-right' : 'text-left'}`}
      style={{ borderBottom: '1px solid #F0F2F5' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative shrink-0">
        {avatar.url ? (
          <div
            className="relative h-9 w-9 overflow-hidden rounded-full"
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
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EBF5FB] text-xs font-bold text-[#2F76BB]"
            style={{ border: '1px solid #DCE7F2' }}
          >
            {initial}
          </div>
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: actionConfig.avatarBg }}
          >
            {actionConfig.avatarIcon}
          </div>
        )}

        {/* Action Icon Badge on Avatar */}
        <span
          className={`absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow-2xs ${actionConfig.badgeBg}`}
        >
          {actionConfig.icon}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 ${actionConfig.pillClass}`}>
            {actionConfig.icon}
            <span>{title}</span>
          </span>
          <span className="shrink-0 text-[10px] text-[#94A3B8]">
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: false,
              locale: DATE_LOCALES[locale] || fr,
            })}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#64748B]">{body}</p>
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

export type NotificationsDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function NotificationsDropdown({ isOpen, onClose }: NotificationsDropdownProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, locale, dir } = useI18n();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { items, unreadCount, loading } = useAppSelector(selectNotifications);
  const isRtl = dir === 'rtl';

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleMarkAllRead = async () => {
    const result = await dispatch(markAllNotificationsRead());
    if (markAllNotificationsRead.fulfilled.match(result)) {
      void dispatch(fetchNotifications());
    }
  };

  const handleGoToPreferences = () => {
    onClose();
    router.push('/settings/notifications');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={`absolute top-full z-50 mt-2 w-80 rounded-2xl bg-white shadow-xl sm:w-96 ${
            isRtl ? 'left-0' : 'right-0'
          }`}
          style={{
            border: `1px solid ${matchyBrand.border}`,
            boxShadow: '0 12px 36px -6px rgba(0, 0, 0, 0.14), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
          }}
          dir={dir}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: `1px solid ${matchyBrand.border}` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold" style={{ color: matchyBrand.textDark }}>
                {t('notificationSettings.dropdownTitle')}
              </span>
              {unreadCount > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: matchyBrand.blue }}
                >
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2F76BB] hover:underline"
              >
                <CheckCheck size={14} />
                {t('notificationSettings.markAllRead')}
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-80 divide-y divide-[#F0F2F5] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-[#64748B]">
                <Loader2 className="h-6 w-6 animate-spin text-[#2F76BB]" />
                <p className="text-xs">{t('common.loading') || 'Loading...'}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-xs font-medium text-[#64748B]">
                {t('notificationSettings.emptyTitle')}
              </div>
            ) : (
              items
                .slice(0, 10)
                .map((item) => (
                  <DropdownNotificationRow key={item.id} item={item} onClose={onClose} />
                ))
            )}
          </div>

          {/* Footer */}
          <div
            className="p-2"
            style={{
              borderTop: `1px solid ${matchyBrand.border}`,
              background: '#F8FAFC',
              borderBottomLeftRadius: '1rem',
              borderBottomRightRadius: '1rem',
            }}
          >
            <button
              type="button"
              onClick={handleGoToPreferences}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-[#475569] transition-colors hover:bg-white hover:text-[#2F76BB]"
            >
              <Settings size={14} />
              <span>{t('notificationSettings.preferencesLink')}</span>
              <ChevronRight
                size={13}
                className={isRtl ? 'rotate-180' : ''}
                style={{ marginLeft: isRtl ? 0 : 2, marginRight: isRtl ? 2 : 0 }}
              />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
