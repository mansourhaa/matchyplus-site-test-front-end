'use client';

import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { APP_REGISTER_URL } from '@/lib/constants';
import { ArrowLeft, ArrowRight, ExternalLink, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from './motion';
import { PressCard } from './press-card';
import { pressDate, pressItem, pressItems, youtubeId } from './press-data';

/** /actualites/: every news item, newest first, in the site's sub-page band. */
export function PressList() {
  const { t } = useI18n();
  const items = pressItems();

  return (
    <main>
      <SubpageHero
        eyebrow={t('landing.pressKicker')}
        title={t('landing.pressPageTitle')}
        subtitle={t('landing.pressSubtitle')}
      />
      <div className="mx-auto -mt-16 grid max-w-6xl gap-6 px-5 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <Reveal key={item.slug} delay={(index % 3) * 0.08}>
            <PressCard item={item} index={index} withSummary className="h-full" />
          </Reveal>
        ))}
      </div>
    </main>
  );
}

/** /actualites/<slug>/: one news item, with its YouTube video and/or its text. */
export function PressArticle({ slug }: { slug: string }) {
  const { t, locale } = useI18n();
  const item = pressItem(slug);
  if (!item) return null;
  const text = item.text[locale];
  const date = pressDate(item.date, locale);
  const video = youtubeId(item.video);

  return (
    <main>
      <SubpageHero eyebrow={`${date.full} · ${text.tag}`} title={text.title}>
        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white/90">
          <MapPin className="h-4 w-4 shrink-0" />
          {text.place}
          {item.sample && (
            <span className="ms-2 rounded-full bg-white/15 px-2.5 py-0.5 text-xs">
              {t('landing.pressSample')}
            </span>
          )}
        </p>
      </SubpageHero>

      <article className="mx-auto -mt-20 max-w-3xl px-5 pb-24">
        {video ? (
          <div className="relative aspect-video overflow-hidden rounded-3xl bg-black shadow-2xl">
            {/* youtube-nocookie: no YouTube cookies until the visitor plays the video */}
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video}`}
              title={t('landing.pressVideo', { title: text.title })}
              loading="lazy"
              // YouTube refuses to play embeds that arrive without the site's address
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        ) : (
          item.cover && (
            <div className="relative aspect-video overflow-hidden rounded-3xl shadow-2xl">
              <Image
                src={item.cover}
                alt={text.coverAlt ?? ''}
                fill
                priority
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
            </div>
          )
        )}

        {/* the text as on /utilisation/: a lead paragraph, then numbered steps along a dashed line */}
        {/* the text as on /a-propos/: dark text on white, a bold heading then its paragraph */}
        <div className="text-[#101a36]">
          <p className="mt-12 text-lg leading-[1.65] font-semibold">{text.intro}</p>
          {text.sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="mb-2.5 text-[1.75rem] leading-tight font-extrabold">
                {section.heading}
              </h2>
              <p className="leading-[1.65]">{section.text}</p>
            </section>
          ))}
        </div>

        {/* the next step for each reader: a client, a professional or a partner */}
        <div className="from-brand-navy to-brand-blue mt-14 flex flex-col gap-3 rounded-3xl bg-gradient-to-br p-6 text-white shadow-xl sm:flex-row sm:flex-wrap sm:items-center md:p-8">
          <p className="text-lg font-extrabold sm:me-auto">{t('landing.pressNext')}</p>
          <Link
            href={localizePath(locale, '/recherche')}
            className="text-brand-blue inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold shadow-lg transition-transform hover:scale-[1.03]"
          >
            {t('landing.pressCtaFind')}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
          <a
            href={APP_REGISTER_URL}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold ring-1 ring-white/40 transition-colors hover:bg-white/25"
          >
            {t('landing.searchProCta')}
          </a>
          <Link
            href={localizePath(locale, '/devenir-partenaire')}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold underline-offset-4 hover:underline"
          >
            {t('landing.pressCtaPartner')}
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={localizePath(locale, '/actualites')}
            className="text-brand-blue inline-flex items-center gap-2 text-sm font-bold hover:underline"
          >
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
            {t('landing.pressAll')}
          </Link>
          {item.website && (
            <a
              href={item.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue ring-brand-blue/30 hover:bg-brand-blue/5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ring-1 transition-colors"
            >
              {t('landing.pressWebsite')}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {item.linkedin && (
            <a
              href={item.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-brand-blue hover:bg-brand-navy inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-colors"
            >
              {t('landing.pressLinkedin')}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </article>
    </main>
  );
}
