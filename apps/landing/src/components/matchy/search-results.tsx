'use client';

import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { APP_REGISTER_URL } from '@/lib/constants';
import { ArrowRight, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { buildSearchUrl, sampleResultCount } from './search-results-data';

/**
 * Results of the hero search, in the site's sub-page band: how many pros match, then a button
 * to sign up and see them. The sign-up link carries the search, like the hero did before.
 */
export function SearchResults() {
  const { t, locale } = useI18n();
  const params = useSearchParams();
  const service = params.get('service')?.trim() ?? '';
  const city = params.get('ville')?.trim() ?? '';

  return (
    <main>
      <SubpageHero
        eyebrow={t('landing.resultsEyebrow')}
        title={t('landing.resultsTitle', { count: sampleResultCount(service, city) })}
        subtitle={t('landing.resultsBody')}
      >
        <p className="flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
          {service && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
              <Search className="h-4 w-4 shrink-0" />
              {service}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
            <MapPin className="h-4 w-4 shrink-0" />
            {city || t('landing.resultsNear')}
          </span>
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <Link
            href={buildSearchUrl(APP_REGISTER_URL, service, city)}
            className="text-brand-blue inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold shadow-lg transition-transform hover:-translate-y-0.5 md:text-base"
          >
            {t('landing.resultsCta')}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
          <Link
            href={localizePath(locale, '/')}
            className="text-sm font-bold text-white underline underline-offset-4 hover:no-underline"
          >
            {t('landing.resultsBack')}
          </Link>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/90">
            {t('landing.resultsSample')}
          </span>
        </div>
      </SubpageHero>
    </main>
  );
}

/** Shown while the search is read from the URL (the prerendered HTML has no search yet). */
export function SearchResultsLoading() {
  const { t } = useI18n();
  return (
    <main>
      <SubpageHero eyebrow={t('landing.resultsEyebrow')} title={t('landing.resultsSearching')} />
    </main>
  );
}
