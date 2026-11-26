'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { APP_REGISTER_URL, appLink } from '@/lib/constants';
import { ArrowRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import { numberLocale } from './community-map';
import { type ProCount, correctedSearch, countWords, fetchProCount } from './search-counts';
import { SearchForm } from './search-form';
import { buildSearchUrl } from './search-results-data';

/**
 * /recherche/: a results page, not a copy of the home hero. A slim blue band with the search bar
 * (filled with the corrected search, editable), then on white, centred: the real number of pros
 * that match (from the API), very large ("35"), the sentence under it ("plombiers disponibles à
 * Sousse", see search-counts.ts), one line, and one big sign-up button. No number when the
 * search is not recognised, nobody matches or the API cannot be reached: the usual title.
 */
export function SearchResults() {
  const { t, locale } = useI18n();
  const params = useSearchParams();
  const typedService = params.get('service')?.trim() ?? '';
  const typedCity = params.get('ville')?.trim() ?? '';
  const corrected = correctedSearch(typedService, typedCity, locale);
  const count = useProCount(typedService, typedCity);
  const registerUrl = buildSearchUrl(
    appLink(APP_REGISTER_URL, locale),
    corrected.service,
    corrected.city,
  );
  // the trade in the right form for the number ("1 plombier disponible", "35 plombiers disponibles")
  const words = count ? countWords(count, locale) : null;

  return (
    // a new search on this page re-fills the bar with its corrected words
    <SearchShell
      key={`${typedService}|${typedCity}`}
      service={corrected.service}
      city={corrected.city}
    >
      <div className="relative mx-auto max-w-2xl text-center">
        {/* soft dot pattern behind the number, fading out at the edges */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-6 h-72"
          style={{
            backgroundImage: 'radial-gradient(rgba(45,121,190,0.16) 1.5px, transparent 1.5px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          }}
        />
        <h1 className="text-brand-navy relative">
          {count ? (
            <span data-testid="results-count" className="block">
              <span className="from-brand-blue to-brand-teal block bg-gradient-to-br bg-clip-text text-[6.5rem] leading-none font-extrabold tracking-tight text-transparent md:text-[9rem]">
                {new Intl.NumberFormat(numberLocale(locale)).format(count.count)}
              </span>
              <span className="mt-4 block text-2xl leading-snug font-extrabold md:text-3xl">
                {t(words?.singular ? 'landing.resultsCountLabelOne' : 'landing.resultsCountLabel', {
                  service: words?.service ?? '',
                  city: words?.city ?? '',
                })}
              </span>
            </span>
          ) : (
            <span className="block text-3xl leading-tight font-extrabold md:text-4xl">
              {t('landing.resultsTitle')}
            </span>
          )}
        </h1>
        <p className="relative mx-auto mt-4 max-w-md leading-relaxed text-slate-600 md:text-lg">
          {t('landing.resultsBody')}
        </p>
        {/* the app is another site: a plain link, not Next's client-side <Link> */}
        <a
          href={registerUrl}
          className="bg-brand-blue hover:bg-brand-navy shadow-brand-blue/30 relative mt-10 flex w-full items-center justify-center gap-2 rounded-full py-4 text-lg font-bold text-white shadow-xl transition-colors"
        >
          {t('landing.resultsCta')}
          <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
        </a>
      </div>
    </SearchShell>
  );
}

/**
 * The number of pros for this search, from the API. Null until the answer arrives, and when the
 * search is not recognised, nobody matches or the API cannot be reached (no number is shown).
 */
function useProCount(service: string, city: string): ProCount | null {
  const search = `${service}|${city}`;
  const [answer, setAnswer] = useState<{ search: string; count: ProCount | null } | null>(null);

  useEffect(() => {
    let current = true;
    void fetchProCount(service, city).then((count) => {
      if (current) setAnswer({ search, count });
    });
    // a newer search (or leaving the page) ignores this answer
    return () => {
      current = false;
    };
  }, [search, service, city]);

  // an answer for an older search does not count
  return answer?.search === search ? answer.count : null;
}

/** The page frame: slim blue band with the search bar, then the white results area. */
function SearchShell({
  service,
  city,
  children,
}: {
  service: string;
  city: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  // the bar starts with the corrected search and stays editable
  const [serviceValue, setServiceValue] = useState(service);
  const [cityValue, setCityValue] = useState(city);

  return (
    <main className="bg-white pb-24">
      <section className="from-brand-blue to-brand-teal bg-gradient-to-br px-5 pt-28 pb-8 md:pt-32">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-bold tracking-widest text-white/80 uppercase">
            {t('landing.resultsEyebrow')}
          </p>
          <SearchForm
            service={serviceValue}
            city={cityValue}
            onServiceChange={setServiceValue}
            onCityChange={setCityValue}
          />
        </div>
      </section>
      <section className="px-5 pt-16 md:pt-20">{children}</section>
    </main>
  );
}

/** Shown while the search is read from the URL (the prerendered HTML has no search yet). */
export function SearchResultsLoading() {
  const { t } = useI18n();
  return (
    <SearchShell service="" city="">
      <h1 className="text-brand-navy text-2xl font-extrabold md:text-3xl">
        {t('landing.resultsSearching')}
      </h1>
    </SearchShell>
  );
}
