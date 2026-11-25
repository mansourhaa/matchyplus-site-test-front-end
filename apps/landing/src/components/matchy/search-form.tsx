'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { MapPin, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId } from 'react';

import { withSearch } from './search-results-data';

type SearchFormProps = {
  service: string;
  city: string;
  onServiceChange: (value: string) => void;
  onCityChange: (value: string) => void;
};

/**
 * "What service?" and "where?", then Rechercher: opens the results page with the search in the
 * URL. The same form on the home page (hero) and at the top of the results page.
 */
export function SearchForm({ service, city, onServiceChange, onCityChange }: SearchFormProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const serviceId = useId();
  const cityId = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(withSearch(localizePath(locale, '/recherche'), service, city));
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-black/15 sm:flex-row sm:items-stretch"
    >
      <label htmlFor={serviceId} className="flex flex-1 flex-col rounded-xl px-3 py-1.5 text-start">
        <span className="text-brand-navy text-xs font-bold">{t('landing.searchWhat')}</span>
        <span className="flex items-center gap-1.5">
          <Search className="text-brand-teal h-4 w-4 shrink-0" />
          <input
            id={serviceId}
            value={service}
            onChange={(event) => onServiceChange(event.target.value)}
            placeholder={t('landing.searchWhatPlaceholder')}
            className="text-brand-navy w-full bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
          />
        </span>
      </label>
      <span aria-hidden="true" className="hidden w-px self-stretch bg-slate-200 sm:block" />
      <label htmlFor={cityId} className="flex flex-1 flex-col rounded-xl px-3 py-1.5 text-start">
        <span className="text-brand-navy text-xs font-bold">{t('landing.searchWhere')}</span>
        <span className="flex items-center gap-1.5">
          <MapPin className="text-brand-teal h-4 w-4 shrink-0" />
          <input
            id={cityId}
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            placeholder={t('landing.searchWherePlaceholder')}
            className="text-brand-navy w-full bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
          />
        </span>
      </label>
      <button
        type="submit"
        className="bg-brand-blue hover:bg-brand-navy flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <Search className="h-4 w-4" />
        {t('landing.searchSubmit')}
      </button>
    </form>
  );
}
