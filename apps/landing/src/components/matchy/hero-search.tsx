'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { APP_LOGIN_URL, APP_REGISTER_URL, appLink } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ArrowRight, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { SearchForm } from './search-form';

type Audience = 'client' | 'pro' | 'business';

const AUDIENCE_CTA =
  'bg-brand-blue hover:bg-brand-navy flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold whitespace-nowrap text-white transition-colors';

/**
 * Hero search: who you are, then what you need and where.
 * A search opens the results page (how many pros match), which then leads to sign-up.
 */
export function HeroSearch() {
  const { t, locale } = useI18n();
  const [audience, setAudience] = useState<Audience>('client');
  const [service, setService] = useState('');
  const [city, setCity] = useState('');

  const tabs: { key: Audience; label: string }[] = [
    { key: 'client', label: t('landing.searchTabClient') },
    { key: 'pro', label: t('landing.searchTabPro') },
    { key: 'business', label: t('landing.searchTabBusiness') },
  ];

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
        <div className="mt-3">
          <SearchForm
            service={service}
            city={city}
            onServiceChange={setService}
            onCityChange={setCity}
          />
        </div>
      )}

      {audience !== 'client' && (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-white p-4 text-start shadow-2xl shadow-black/15 sm:flex-row sm:items-center">
          <p className="text-brand-navy flex-1 text-sm leading-relaxed font-semibold">
            {audience === 'pro' ? t('landing.searchProText') : t('landing.searchBusinessText')}
          </p>
          {/* pros go to the app (another site, a plain link); businesses to our partner page */}
          {audience === 'pro' ? (
            <a href={appLink(APP_REGISTER_URL, locale)} className={AUDIENCE_CTA}>
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
          href={appLink(APP_LOGIN_URL, locale)}
          className="inline-flex items-center gap-1 font-bold text-white underline underline-offset-4 hover:no-underline"
        >
          <LogIn className="h-4 w-4 rtl:-scale-x-100" />
          {t('landing.login')}
        </a>
      </p>
    </div>
  );
}
