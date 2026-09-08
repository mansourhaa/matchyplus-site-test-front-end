'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { MatchyBottomNav } from '@/components/matchy/matchy-bottom-nav';
import { MatchyHeaderActions } from '@/components/matchy/matchy-header-actions';
import { MatchySidebar } from '@/components/matchy/matchy-sidebar';
/** Secondary screens: desktop sidebar + mobile/desktop page header with back. */
import { useI18n } from '@/features/i18n/i18n-provider';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

type MatchyAppShellProps = {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  backPath?: string;
  headerRight?: ReactNode;
  hideHeader?: boolean;
};

export function MatchyAppShell({
  children,
  title,
  showBack = true,
  backPath,
  headerRight,
  hideHeader = false,
}: MatchyAppShellProps) {
  const router = useRouter();
  const { locale } = useI18n();
  const isRtl = locale === 'ar';

  const handleBack = () => {
    if (backPath) router.push(backPath);
    else router.back();
  };

  const rightActions = headerRight ?? <MatchyHeaderActions />;

  return (
    <div
      className="flex min-h-dvh min-h-screen w-full"
      style={{ background: matchyBrand.bg, fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif" }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <MatchySidebar />

      <div className="flex min-h-dvh min-h-screen flex-1 flex-col overflow-hidden">
        {!hideHeader && (
          <header
            className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between px-4 md:px-6"
            style={{
              background: 'white',
              borderBottom: `1px solid ${matchyBrand.border}`,
              height: 64,
            }}
          >
            <div className="flex items-center gap-3">
              {showBack && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-slate-100"
                  style={{
                    background: matchyBrand.bg,
                    border: `1px solid ${matchyBrand.borderStrong}`,
                  }}
                  aria-label="Go back"
                >
                  <ChevronLeft
                    size={18}
                    color={matchyBrand.text}
                    className={isRtl ? 'rotate-180' : ''}
                  />
                </button>
              )}
              {title && (
                <h1
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: matchyBrand.textDark,
                  }}
                >
                  {title}
                </h1>
              )}
            </div>

            <div className="flex items-center gap-2 md:gap-3">{rightActions}</div>
          </header>
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden pb-[60px] md:pb-0">{children}</div>
        <MatchyBottomNav />
      </div>
    </div>
  );
}
