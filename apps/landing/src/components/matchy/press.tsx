'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Reveal } from './motion';
import { PressCard } from './press-card';
import { pressItems } from './press-data';

/** How many news the home page shows; the rest is on /actualites/. */
const HOME_COUNT = 3;

/**
 * Matchy+ Press on the home page: the latest news as big cards (a swipeable row on phones, a
 * grid on computers) and a link to all the news.
 */
export function Press() {
  const { t, locale } = useI18n();
  const items = pressItems().slice(0, HOME_COUNT);

  return (
    <section id="press" className="mx-auto max-w-6xl px-5 py-20 md:py-24">
      <Reveal className="text-center">
        <div className="bg-brand-teal mx-auto mb-4 h-1 w-10 rounded" />
        <p className="text-brand-teal mb-2 text-sm font-semibold tracking-wide">
          {t('landing.pressKicker')}
        </p>
        <h2 className="text-brand-blue text-3xl font-bold text-balance md:text-4xl">
          {t('landing.pressTitle')}
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed md:text-base">
          {t('landing.pressSubtitle')}
        </p>
      </Reveal>

      <div className="-mx-5 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {items.map((item, index) => (
          <Reveal
            key={item.slug}
            delay={index * 0.08}
            className="w-[82%] shrink-0 snap-start sm:w-80 md:w-auto"
          >
            <PressCard item={item} index={index} className="h-full" />
          </Reveal>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href={localizePath(locale, '/actualites')}
          className="bg-brand-blue hover:bg-brand-navy inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-colors"
        >
          {t('landing.pressAll')}
          <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </section>
  );
}
