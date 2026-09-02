'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { FlagIcon } from '@/components/matchy/flag-icon';
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
  Radio,
  ShieldCheck,
  Star,
  User,
  Video,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

const LANG_FLAGS: Record<Locale, ReactNode> = {
  fr: <FlagIcon locale="fr" size={13} />,
  en: <FlagIcon locale="en" size={13} />,
  ar: <FlagIcon locale="ar" size={13} />,
};
const LANG_NAMES: Record<Locale, string> = { fr: 'Français', en: 'English', ar: 'العربية' };

type UserStatus = 'available' | 'busy' | 'invisible';

const STATUS_CONFIG: Record<
  UserStatus,
  {
    labelKey: 'statusAvailable' | 'statusBusy' | 'statusInvisible';
    color: string;
    bg: string;
    dot: string;
  }
> = {
  available: {
    labelKey: 'statusAvailable',
    color: '#4EAD96',
    bg: '#EAF7F3',
    dot: '#4EAD96',
  },
  busy: {
    labelKey: 'statusBusy',
    color: '#EF4444',
    bg: '#FDEAEA',
    dot: '#EF4444',
  },
  invisible: {
    labelKey: 'statusInvisible',
    color: '#4B5563',
    bg: '#F3F4F6',
    dot: '#4B5563',
  },
};

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
  disabled?: boolean;
};

export function SettingsView() {
  const { t, locale, setLocale, dir } = useI18n();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const { profile } = useAppSelector(selectOnboarding);
  const photo = useAuthenticatedMediaUrl(profile?.image);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [status, setStatus] = useState<UserStatus>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('matchy_user_status') as UserStatus | null;
      if (stored && (stored === 'available' || stored === 'busy' || stored === 'invisible')) {
        return stored;
      }
    }
    return 'available';
  });

  useEffect(() => {
    void dispatch(fetchOnboardingProfile());
  }, [dispatch]);

  const handleSetStatus = (next: UserStatus) => {
    setStatus(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('matchy_user_status', next);
    }
    setShowStatusPicker(false);
  };

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
          label: t('settings.availabilityStatus'),
          icon: Radio,
          path: null,
          color: STATUS_CONFIG[status].color,
          bg: STATUS_CONFIG[status].bg,
          onClick: () => setShowStatusPicker(true),
          badge: t(`settings.${STATUS_CONFIG[status].labelKey}`),
          badgeFlag: (
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: STATUS_CONFIG[status].dot }}
            />
          ),
        },
        {
          label: t('settings.notifications'),
          icon: Bell,
          path: '/settings/notifications',
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
        },
        {
          label: t('settings.wallet'),
          icon: Wallet,
          path: null,
          color: '#F5A623',
          bg: '#FFF8EB',
          disabled: true,
          badge: t('settings.comingSoon'),
        },
      ],
    },
    {
      title: t('settings.groupLegal'),
      items: [
        {
          label: t('settings.privacyPolicy'),
          icon: FileText,
          path: '/settings/privacy-policy',
          color: matchyBrand.muted,
          bg: '#F5F5F5',
        },
        {
          label: t('settings.terms'),
          icon: FileText,
          path: '/settings/terms-of-service',
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
                    disabled={item.disabled}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 transition-colors ${
                      item.disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-[#F9FAFC]'
                    }`}
                    style={{
                      borderBottom:
                        i < group.items.length - 1 ? `1px solid ${matchyBrand.border}` : 'none',
                    }}
                    onClick={() => {
                      if (item.disabled) return;
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
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                        style={{
                          background: item.disabled ? '#F1F5F9' : matchyBrand.softBlue,
                          color: item.disabled ? '#64748B' : matchyBrand.blue,
                        }}
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
        {showStatusPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowStatusPicker(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="w-full rounded-t-3xl bg-white p-6 shadow-2xl md:max-w-sm md:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
              <p className="mb-4 text-lg font-extrabold" style={{ color: matchyBrand.textDark }}>
                {t('settings.availabilityStatus')}
              </p>
              <div className="space-y-2.5">
                {(['available', 'busy', 'invisible'] as UserStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  const isSelected = status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSetStatus(s)}
                      className="flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 transition-all active:scale-[0.99]"
                      style={{
                        background: isSelected ? matchyBrand.activeNav : matchyBrand.bg,
                        border: isSelected
                          ? `2px solid ${matchyBrand.blue}`
                          : '2px solid transparent',
                      }}
                    >
                      <span
                        className="h-4 w-4 shrink-0 rounded-full shadow-xs"
                        style={{ background: cfg.dot }}
                      />
                      <span className="text-sm font-bold" style={{ color: '#303030' }}>
                        {t(`settings.${cfg.labelKey}`)}
                      </span>
                      {isSelected && (
                        <div
                          className="ml-auto flex h-6 w-6 items-center justify-center rounded-full"
                          style={{ background: matchyBrand.blue }}
                        >
                          <Check size={14} color="white" strokeWidth={2.5} />
                        </div>
                      )}
                    </button>
                  );
                })}
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
