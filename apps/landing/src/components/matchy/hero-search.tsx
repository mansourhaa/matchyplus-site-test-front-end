'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { APP_LOGIN_URL, APP_REGISTER_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ArrowRight, LogIn, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';

import { withSearch } from './search-results-data';

type Audience = 'client' | 'pro' | 'business';

const AUDIENCE_CTA =
  'bg-brand-blue hover:bg-brand-navy flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold whitespace-nowrap text-white transition-colors';

/**
 * Hero search: who you are, then what you need and where.
 * A search opens the results page (how many pros match), which then leads to sign-up.
 */
export function HeroSearch() {
  const { t, locale, tList } = useI18n();
  const router = useRouter();
  const [audience, setAudience] = useState<Audience>('client');
  const [service, setService] = useState('');
  const [city, setCity] = useState('');
  const serviceId = useId();
  const cityId = useId();
  const popular = tList('landing.searchPopular');

  const tabs: { key: Audience; label: string }[] = [
    { key: 'client', label: t('landing.searchTabClient') },
    { key: 'pro', label: t('landing.searchTabPro') },
    { key: 'business', label: t('landing.searchTabBusiness') },
  ];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(withSearch(localizePath(locale, '/recherche'), service, city));
  };

  return (
    <div className="mt-8 w-full max-w-xl">
      <div
        role="group"
        aria-label={t('landing.searchTabsLabel')}
        className="inline-flex flex-wrap gap-1 rounded-2xl bg-white/15 p-1 backdrop-blur-md"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={audience === tab.key}
            onClick={() => setAudience(tab.key)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white',
              audience === tab.key
                ? 'text-brand-blue bg-white shadow-md'
                : 'text-white hover:bg-white/15',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {audience === 'client' && (
        <>
          <form
            onSubmit={submit}
            className="mt-3 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-black/15 sm:flex-row sm:items-stretch"
          >
            <label
              htmlFor={serviceId}
              className="flex flex-1 flex-col rounded-xl px-3 py-1.5 text-start"
            >
              <span className="text-brand-navy text-xs font-bold">{t('landing.searchWhat')}</span>
              <span className="flex items-center gap-1.5">
                <Search className="text-brand-teal h-4 w-4 shrink-0" />
                <input
                  id={serviceId}
                  value={service}
                  onChange={(event) => setService(event.target.value)}
                  placeholder={t('landing.searchWhatPlaceholder')}
                  className="text-brand-navy w-full bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
                />
              </span>
            </label>
            <span aria-hidden="true" className="hidden w-px self-stretch bg-slate-200 sm:block" />
            <label
              htmlFor={cityId}
              className="flex flex-1 flex-col rounded-xl px-3 py-1.5 text-start"
            >
              <span className="text-brand-navy text-xs font-bold">{t('landing.searchWhere')}</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="text-brand-teal h-4 w-4 shrink-0" />
                <input
                  id={cityId}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
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
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/80">{t('landing.searchPopularLabel')}</span>
            {popular.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setService(item)}
                className="rounded-full border border-white/40 bg-white/10 px-3 py-1 font-semibold text-white transition-colors hover:bg-white/25"
              >
                {item}
              </button>
            ))}
          </div>
        </>
      )}

      {audience !== 'client' && (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-white p-4 text-start shadow-2xl shadow-black/15 sm:flex-row sm:items-center">
          <p className="text-brand-navy flex-1 text-sm leading-relaxed font-semibold">
            {audience === 'pro' ? t('landing.searchProText') : t('landing.searchBusinessText')}
          </p>
          {/* pros go to the app (another site, a plain link); businesses to our partner page */}
          {audience === 'pro' ? (
            <a href={APP_REGISTER_URL} className={AUDIENCE_CTA}>
              {t('landing.searchProCta')}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </a>
          ) : (
            <Link href={localizePath(locale, '/devenir-partenaire')} className={AUDIENCE_CTA}>
              {t('landing.searchBusinessCta')}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          )}
        </div>
      )}

      <p className="mt-5 text-sm text-white/85">
        {t('landing.searchMember')}{' '}
        <a
          href={APP_LOGIN_URL}
          className="inline-flex items-center gap-1 font-bold text-white underline underline-offset-4 hover:no-underline"
        >
          <LogIn className="h-4 w-4 rtl:-scale-x-100" />
          {t('landing.login')}
        </a>
      </p>
    </div>
  );
}
