'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { logout, selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import {
  fetchOnboardingProfile,
  selectOnboarding,
} from '@/features/onboarding/store/onboarding-slice';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { landingPath } from '@/lib/landing';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Check,
  ChevronRight,
  Clock,
  Crown,
  FileText,
  Globe,
  Lock,
  LogOut,
  QrCode,
  ShieldCheck,
  Star,
  User,
  Video,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

function FlagFr() {
  return (
    <svg width="18" height="13" viewBox="0 0 3 2" className="inline-block rounded-sm align-middle">
      <rect width="1" height="2" fill="#002395" />
      <rect x="1" width="1" height="2" fill="#FFFFFF" />
      <rect x="2" width="1" height="2" fill="#ED2939" />
    </svg>
  );
}

function FlagEn() {
  return (
    <svg
      width="18"
      height="13"
      viewBox="0 0 50 30"
      className="inline-block rounded-sm align-middle"
    >
      <rect width="50" height="30" fill="#012169" />
      <path d="M0 0 L50 30 M0 30 L50 0" stroke="#FFF" strokeWidth="6" />
      <path d="M0 0 L50 30 M0 30 L50 0" stroke="#C8102E" strokeWidth="2" />
      <path d="M25 0 V30 M0 15 H50" stroke="#FFF" strokeWidth="10" />
      <path d="M25 0 V30 M0 15 H50" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

function FlagAr() {
  return (
    <svg
      width="18"
      height="13"
      viewBox="0 0 120 80"
      className="inline-block rounded-sm align-middle"
    >
      <rect width="120" height="80" fill="#E71F19" />
      <circle cx="60" cy="40" r="20" fill="#FFF" />
      <circle cx="64" cy="40" r="16" fill="#E71F19" />
      <circle cx="60" cy="40" r="16" fill="#FFF" />
      <path d="M 64,32 A 8,8 0 1,0 64,48 A 8,8 0 1,0 64,32 Z" fill="#E71F19" />
    </svg>
  );
}

const LANG_FLAGS: Record<Locale, ReactNode> = {
  fr: <FlagFr />,
  en: <FlagEn />,
  ar: <FlagAr />,
};
const LANG_NAMES: Record<Locale, string> = { fr: 'Français', en: 'English', ar: 'العربية' };

type SettingsItem = {
  label: string;
  icon: typeof User;
  path?: string | null;
  /** Absolute URL (e.g. landing legal docs) — leaves the app. */
  externalUrl?: string;
  color: string;
  bg: string;
  onClick?: () => void;
  badge?: string;
  badgeFlag?: ReactNode;
};

export function SettingsView() {
  const { t, locale, setLocale, dir } = useI18n();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const { profile } = useAppSelector(selectOnboarding);
  const photo = useAuthenticatedMediaUrl(profile?.image);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    void dispatch(fetchOnboardingProfile());
  }, [dispatch]);

  const displayName = auth.user?.name || auth.user?.email || 'Matchy';
  const email = auth.user?.email || '';
  const initial = displayName.slice(0, 1).toUpperCase();

  const groups: { title: string; items: SettingsItem[] }[] = [
    {
      title: t('settings.groupAccount'),
      items: [
        {
          label: t('settings.account'),
          icon: User,
          path: '/settings/account',
          color: matchyBrand.blue,
          bg: matchyBrand.softBlue,
        },
        {
          label: t('settings.verifyAccount'),
          icon: ShieldCheck,
          path: '/settings/verify-account',
          color: matchyBrand.teal,
          bg: matchyBrand.softTeal,
        },
        {
          label: t('settings.privacy'),
          icon: Lock,
          path: '/settings/privacy',
          color: matchyBrand.teal,
          bg: matchyBrand.softTeal,
        },
      ],
    },
    {
      title: t('settings.groupApp'),
      items: [
        {
          label: t('settings.language'),
          icon: Globe,
          path: null,
          color: matchyBrand.orange,
          bg: '#FFF8EB',
          onClick: () => setShowLangPicker(true),
          badge: LANG_NAMES[locale],
          badgeFlag: LANG_FLAGS[locale],
        },
        {
          label: t('settings.notifications'),
          icon: Bell,
          path: '/notifications',
          color: '#E74C3C',
          bg: '#FDEAEA',
        },
        {
          label: t('settings.video'),
          icon: Video,
          path: '/settings/video',
          color: '#9B59B6',
          bg: '#F3E8FA',
        },
      ],
    },
    {
      title: t('settings.groupActivity'),
      items: [
        {
          label: t('settings.history'),
          icon: Clock,
          path: '/settings/history',
          color: matchyBrand.muted,
          bg: '#F5F5F5',
        },
        {
          label: t('settings.favorites'),
          icon: Star,
          path: '/settings/favorites',
          color: matchyBrand.blue,
          bg: matchyBrand.softBlue,
        },
        {
          label: t('settings.qrCode'),
          icon: QrCode,
          path: '/settings/qr-code',
          color: matchyBrand.teal,
          bg: matchyBrand.softTeal,
        },
      ],
    },
    {
      title: t('settings.groupPlan'),
      items: [
        {
          label: t('settings.subscription'),
          icon: Crown,
          path: '/settings/plans',
          color: matchyBrand.muted,
          bg: '#F5F5F5',
          badge: t('nav.planFree'),
        },
      ],
    },
    {
      title: t('settings.groupLegal'),
      items: [
        {
          label: t('settings.privacyPolicy'),
          icon: FileText,
          externalUrl: landingPath('/privacy-policy', locale),
          color: matchyBrand.muted,
          bg: '#F5F5F5',
        },
        {
          label: t('settings.terms'),
          icon: FileText,
          externalUrl: landingPath('/terms-of-service', locale),
          color: matchyBrand.muted,
          bg: '#F5F5F5',
        },
      ],
    },
  ];

  const handleLogout = async () => {
    setShowLogoutModal(false);
    // Await cookie clear from POST /auth/logout before leaving — otherwise proxy.ts
    // still sees access_token on /login and immediately redirects back to /home.
    await dispatch(logout());
    window.location.assign('/login');
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }} dir={dir}>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white p-4 shadow-sm"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold text-white"
              style={{
                border: `2px solid ${matchyBrand.muted}`,
                background: matchyBrand.gradient135,
              }}
            >
              {photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-extrabold" style={{ color: matchyBrand.text }}>
                {displayName}
              </p>
              <p className="truncate text-xs" style={{ color: matchyBrand.muted }}>
                {email}
              </p>
              <div
                className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ background: '#F5F5F5', border: '1px solid #E0E0E0' }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: matchyBrand.muted }}>
                  {t('nav.planFree')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/edit-profile')}
              className="shrink-0 rounded-xl px-3 py-2"
              style={{
                background: matchyBrand.softBlue,
                color: matchyBrand.blue,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {t('settings.editProfile')}
            </button>
          </div>
        </motion.div>

        {groups.map((group, gi) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.04 }}
          >
            <p
              className="mb-2 px-1 uppercase"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: matchyBrand.muted,
              }}
            >
              {group.title}
            </p>
            <div
              className="overflow-hidden rounded-2xl bg-white"
              style={{ border: `1px solid ${matchyBrand.border}` }}
            >
              {group.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#F9FAFC]"
                    style={{
                      borderBottom:
                        i < group.items.length - 1 ? `1px solid ${matchyBrand.border}` : 'none',
                    }}
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                        return;
                      }
                      if (item.externalUrl) {
                        window.location.assign(item.externalUrl);
                        return;
                      }
                      if (item.path) router.push(item.path);
                    }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: item.bg }}
                    >
                      <Icon size={17} color={item.color} />
                    </div>
                    <span
                      className={`flex-1 text-sm font-medium ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                      style={{ color: '#303030' }}
                    >
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold"
                        style={{ background: matchyBrand.softBlue, color: matchyBrand.blue }}
                      >
                        {item.badgeFlag}
                        <span>{item.badge}</span>
                      </span>
                    )}
                    <ChevronRight
                      size={15}
                      color="#C0C0C0"
                      style={{ transform: dir === 'rtl' ? 'scaleX(-1)' : undefined }}
                    />
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4"
          style={{
            border: '1.5px solid #FF6B6B',
            fontSize: 14,
            fontWeight: 700,
            color: '#FF6B6B',
            background: 'white',
          }}
          onClick={() => setShowLogoutModal(true)}
        >
          <LogOut size={16} />
          {t('settings.logout')}
        </button>

        <p className="pb-2 text-center text-[11px] text-[#CCC]">Matchy+ v1.0.0</p>
      </div>

      <AnimatePresence>
        {showLangPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowLangPicker(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="w-full rounded-t-3xl bg-white p-6 md:max-w-sm md:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-5 text-lg font-extrabold" style={{ color: matchyBrand.textDark }}>
                {t('settings.language')}
              </p>
              <div className="space-y-2">
                {(['fr', 'en', 'ar'] as Locale[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setLocale(l);
                      setShowLangPicker(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5"
                    style={{
                      background: locale === l ? matchyBrand.activeNav : matchyBrand.bg,
                      border:
                        locale === l ? `2px solid ${matchyBrand.blue}` : '2px solid transparent',
                    }}
                  >
                    <span className="flex shrink-0 items-center">{LANG_FLAGS[l]}</span>
                    <span className="text-sm font-semibold" style={{ color: '#303030' }}>
                      {LANG_NAMES[l]}
                    </span>
                    {locale === l && (
                      <div
                        className="ml-auto flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ background: matchyBrand.blue }}
                      >
                        <Check size={14} color="white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex flex-col items-center text-center">
                <div
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: '#FFF0F0' }}
                >
                  <LogOut size={24} color="#FF6B6B" />
                </div>
                <p className="text-lg font-extrabold" style={{ color: matchyBrand.textDark }}>
                  {t('settings.logoutConfirm')}
                </p>
                <p className="mt-1 text-sm text-[#888]">{t('settings.logoutHint')}</p>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-xl py-3.5 text-sm font-bold text-white"
                  style={{ background: '#FF6B6B' }}
                >
                  {t('settings.logout')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="w-full rounded-xl py-3.5 text-sm font-semibold text-[#555]"
                  style={{ background: '#F5F5F5' }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
