'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { selectMatching } from '@/features/matching/store/matching-slice';
import { Home, MessageCircle, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

type NavKey = 'home' | 'search' | 'matches' | 'profile';

export function MatchyBottomNav() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const matching = useAppSelector(selectMatching);
  const auth = useAppSelector(selectAuth);
  const matchBadge = matching.matches.length;
  const initial = (auth.user?.name || auth.user?.email || '?').slice(0, 1).toUpperCase();

  const active: NavKey =
    pathname.startsWith('/settings') || pathname === '/edit-profile'
      ? 'profile'
      : pathname === '/matches' || pathname.startsWith('/chat')
        ? 'matches'
        : pathname === '/home' && tab === 'search'
          ? 'search'
          : 'home';

  const items: {
    key: NavKey;
    href: string;
    label: string;
    badge: number;
    icon: ReactNode;
  }[] = [
    {
      key: 'home',
      href: '/home',
      label: t('nav.home'),
      badge: 0,
      icon: <Home size={22} />,
    },
    {
      key: 'search',
      href: '/home?tab=search',
      label: t('nav.search'),
      badge: 0,
      icon: <Search size={22} />,
    },
    {
      key: 'matches',
      href: '/matches',
      label: t('nav.matches'),
      badge: matchBadge,
      icon: <MessageCircle size={22} />,
    },
    {
      key: 'profile',
      href: '/settings',
      label: t('nav.profile'),
      badge: 0,
      icon: (
        <div
          className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-white"
          style={{
            border: `2px solid ${active === 'profile' ? matchyBrand.blue : '#D4DCE8'}`,
            background: matchyBrand.gradient135,
          }}
        >
          {initial}
        </div>
      ),
    },
  ];

  return (
    <div
      className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-around px-4 py-2 md:hidden"
      style={{
        background: 'white',
        borderTop: `1px solid ${matchyBrand.border}`,
        boxShadow: '0 -6px 20px rgba(12,24,43,0.08)',
      }}
    >
      {items.map(({ key, href, label, badge, icon }) => {
        const isActive = active === key;
        const hot = key === 'matches' && badge > 0;
        return (
          <button
            key={key}
            type="button"
            onClick={() => router.push(href)}
            className="relative flex flex-col items-center gap-0.5"
            style={{
              color: isActive || hot ? matchyBrand.blue : matchyBrand.mutedLight,
            }}
          >
            <div className="relative">
              {icon}
              {badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full"
                  style={{ background: matchyBrand.badge }}
                >
                  <span style={{ fontSize: 8, fontWeight: 800, color: 'white' }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
