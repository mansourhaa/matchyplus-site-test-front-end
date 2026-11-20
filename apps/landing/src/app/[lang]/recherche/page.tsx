'use client';

import { SearchResults, SearchResultsLoading } from '@/components/matchy/search-results';
import { PageFrame } from '@/components/site-shell';
import { Suspense } from 'react';

// The search is read from the URL in the browser; Suspense lets the page itself be prerendered.
export default function SearchPage() {
  return (
    <PageFrame>
      <Suspense fallback={<SearchResultsLoading />}>
        <SearchResults />
      </Suspense>
    </PageFrame>
  );
}
