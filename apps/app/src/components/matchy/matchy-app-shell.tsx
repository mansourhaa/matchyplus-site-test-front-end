'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { MatchySidebar } from '@/components/matchy/matchy-sidebar';
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

/** Secondary screens: desktop sidebar + mobile/desktop page header with back. */
export function MatchyAppShell({
  children,
  title,
  showBack = true,
  backPath,
  headerRight,
  hideHeader = false,
}: MatchyAppShellProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backPath) router.push(backPath);
    else router.back();
  };

  return (
    <div
      className="flex min-h-dvh min-h-screen w-full"
      style={{ background: matchyBrand.bg, fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif" }}
    >
      <MatchySidebar />

      <div className="flex min-h-dvh min-h-screen flex-1 flex-col overflow-hidden">
        {!hideHeader && (
          <div
            className="flex shrink-0 items-center gap-3 px-4 py-3 md:hidden"
            style={{ background: 'white', borderBottom: `1px solid ${matchyBrand.border}` }}
          >
            {showBack && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: matchyBrand.bg,
                  border: `1px solid ${matchyBrand.borderStrong}`,
                }}
              >
                <ChevronLeft size={20} color={matchyBrand.text} />
              </button>
            )}
            {title && (
              <span
                className="flex-1"
                style={{ fontSize: 16, fontWeight: 700, color: matchyBrand.blue }}
              >
                {title}
              </span>
            )}
            {headerRight && <div className="ml-auto">{headerRight}</div>}
          </div>
        )}

        {!hideHeader && title && (
          <div
            className="hidden shrink-0 items-center gap-3 px-6 py-4 md:flex"
            style={{ background: 'white', borderBottom: `1px solid ${matchyBrand.border}` }}
          >
            {showBack && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: matchyBrand.bg }}
              >
                <ChevronLeft size={18} color="#555" />
              </button>
            )}
            <p style={{ fontSize: 18, fontWeight: 700, color: matchyBrand.textDark }}>{title}</p>
            {headerRight && <div className="ml-auto flex items-center gap-3">{headerRight}</div>}
          </div>
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
