'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { MatchyBottomNav } from '@/components/matchy/matchy-bottom-nav';
import { MatchySidebar } from '@/components/matchy/matchy-sidebar';
import type { ReactNode } from 'react';

/** Home / Search / Matches chrome: desktop sidebar + mobile bottom nav. */
export function MatchyPrimaryShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-dvh min-h-screen w-full"
      style={{ background: matchyBrand.bg, fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif" }}
    >
      <MatchySidebar />
      <div className="relative flex min-h-dvh min-h-screen flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden pb-[74px] md:pb-0">{children}</div>
        <MatchyBottomNav />
      </div>
    </div>
  );
}
