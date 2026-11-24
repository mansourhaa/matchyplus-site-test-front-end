'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { ArrowRight, Quote } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from './motion';

/** The story behind Matchy+: the Matchy+ logo, the founder's quote, her path and the about link. */
export function CompanyStory() {
  const { t, locale } = useI18n();

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-24">
      <Reveal className="bg-brand-blue/[0.05] border-brand-blue/10 relative overflow-hidden rounded-[2.5rem] border p-8 md:p-14">
        <div
          aria-hidden="true"
          className="bg-brand-teal/15 absolute -top-24 h-72 w-72 rounded-full blur-2xl ltr:-right-24 rtl:-left-24"
        />
        <div className="relative grid grid-cols-1 items-center gap-10 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-3">
            {/* the Matchy+ logo in the old round look: a blue-to-green ring around a white circle */}
            <div className="from-brand-blue to-brand-teal rounded-full bg-gradient-to-br p-1.5 shadow-xl">
              <div className="grid h-48 w-48 place-items-center rounded-full border-4 border-white bg-white px-7">
                <Image
                  src="/showcase/matchy-plus-logo.svg"
                  alt={t('landing.storyPhotoAlt')}
                  width={722}
                  height={184}
                  unoptimized
                  className="h-auto w-full"
                />
              </div>
            </div>
            <span className="text-brand-teal -rotate-3 text-lg font-bold">
              {t('landing.storyEyebrow')}
            </span>
          </div>
          <div>
            <Quote className="text-brand-blue/20 h-12 w-12" />
            <p className="text-brand-blue mt-2 text-2xl leading-snug font-extrabold text-balance md:text-3xl">
              {t('landing.storyQuote')}
            </p>
            <p className="text-brand-navy mt-6 font-bold">{t('landing.storyName')}</p>
            <p className="text-muted-foreground text-sm">{t('landing.storyRole')}</p>
            <Link
              href={localizePath(locale, '/a-propos/histoire-matchy-plus')}
              className="text-brand-blue border-brand-teal mt-6 inline-flex items-center gap-2 border-b-2 pb-0.5 font-bold"
            >
              {t('landing.storyLink')}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
