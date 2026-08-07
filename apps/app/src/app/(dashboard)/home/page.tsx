'use client';

import { DiscoverView } from '@/features/matching/components/discover-view';
import { SearchView } from '@/features/matching/components/search-view';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function HomeTabs() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  if (tab === 'search') return <SearchView />;
  return <DiscoverView />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-[#888]">Loading…</div>
      }
    >
      <HomeTabs />
    </Suspense>
  );
}
