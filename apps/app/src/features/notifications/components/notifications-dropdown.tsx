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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef } from 'react';

const PROFILE_VIEW_TINT = '#9B59B6';
const MATCH_TINT = '#E24E59';
const MESSAGE_TINT = '#2F76BB';

const DATE_LOCALES: Record<Locale, typeof fr> = {
  en: enUS,
  fr: fr,
  ar: arSA,
};

function getPushCopy(
  item: NotificationItem,
  locale: Locale,
  isFree = true,
): { title: string; body: string } {
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
        body:
          locale === 'en'
            ? `Someone named "${displayName}" viewed your profile.`
            : locale === 'ar'
              ? `قام شخص باسم "${displayName}" بزيارة ملفك الشخصي.`
              : `Quelqu'un nommé "${displayName}" a consulté votre profil.`,
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
        body:
          item.data.body ||
          (locale === 'en'
            ? `${displayName} sent you a match request.`
            : locale === 'ar'
              ? `أرسل لك ${displayName} طلب مطابقة.`
              : `${displayName} vous a envoyé une demande de match.`),
      };
    }
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
    return <MessageCircle size={15} color={MESSAGE_TINT} />;
  }
  if (item.type === 'MATCH' || item.type === 'MATCH_REQUEST') {
    return <Heart size={15} color={MATCH_TINT} />;
  }
  return <Eye size={15} color={PROFILE_VIEW_TINT} />;
}

function iconBg(item: NotificationItem): string {
  if (item.type === 'MESSAGE') return `${MESSAGE_TINT}1A`;
  if (item.type === 'MATCH' || item.type === 'MATCH_REQUEST') return `${MATCH_TINT}1A`;
  return `${PROFILE_VIEW_TINT}1A`;
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
      {avatar.url ? (
        <div
          className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full"
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
      ) : (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: iconBg(item) }}
        >
          <TypeIcon item={item} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className="truncate text-xs font-bold"
            style={{ color: item.read ? '#334155' : '#0F172A' }}
          >
            {title}
          </p>
          <span className="shrink-0 text-[10px] text-[#94A3B8]">
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: false,
              locale: DATE_LOCALES[locale] || fr,
            })}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#64748B]">{body}</p>
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
