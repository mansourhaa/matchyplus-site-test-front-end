'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { MatchyLogo } from '@/components/matchy/matchy-logo';
import { useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import { selectInboxUnreadCount } from '@/features/messaging/store/messaging-slice';
import { Home, MessageCircle, Search, User } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type NavKey = 'home' | 'search' | 'matches' | 'profile';

function isNavActive(key: NavKey, pathname: string, tab: string | null) {
  if (key === 'profile') return pathname.startsWith('/settings') || pathname === '/edit-profile';
  if (key === 'matches') return pathname === '/matches' || pathname.startsWith('/chat');
  if (key === 'search') return pathname === '/home' && tab === 'search';
  if (key === 'home') return pathname === '/home' && tab !== 'search';
  return false;
}

export function MatchySidebar() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  // Unread messages only — not total match count (that never cleared after reading).
  const matchBadge = useAppSelector(selectInboxUnreadCount);

  const items: { key: NavKey; href: string; icon: typeof Home; label: string; badge: number }[] = [
    { key: 'home', href: '/home', icon: Home, label: t('nav.home'), badge: 0 },
    { key: 'search', href: '/home?tab=search', icon: Search, label: t('nav.search'), badge: 0 },
    {
      key: 'matches',
      href: '/matches',
      icon: MessageCircle,
      label: t('nav.matches'),
      badge: matchBadge,
    },
    { key: 'profile', href: '/settings', icon: User, label: t('nav.profile'), badge: 0 },
  ];

  return (
    <aside
      className="sticky top-0 hidden h-dvh h-screen shrink-0 flex-col overflow-y-auto md:flex"
      style={{
        width: 220,
        background: 'white',
        borderRight: `1px solid ${matchyBrand.border}`,
        zIndex: 30,
      }}
    >
      <div
        className="flex shrink-0 items-center gap-2 px-5 py-5"
        style={{ borderBottom: `1px solid ${matchyBrand.border}` }}
      >
        <MatchyLogo />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map(({ key, href, icon: Icon, label, badge }) => {
          const active = isNavActive(key, pathname, tab);
          const hot = key === 'matches' && badge > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => router.push(href)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
              style={{
                background: active ? matchyBrand.activeNav : hot ? '#F5FAFF' : 'transparent',
                color: active || hot ? matchyBrand.blue : matchyBrand.muted,
              }}
            >
              <div className="relative">
                <Icon size={20} />
                {badge > 0 && (
                  <span
                    className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full"
                    style={{ background: matchyBrand.badge }}
                  >
                    <span style={{ fontSize: 8, fontWeight: 800, color: 'white' }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  </span>
                )}
              </div>
              <span style={{ fontSize: 14, fontWeight: active ? 700 : 500 }}>{label}</span>
              {badge > 0 && (
                <span
                  className="ml-auto rounded-full px-1.5 py-0.5"
                  style={{
                    background: '#FFF0F0',
                    color: matchyBrand.badge,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
