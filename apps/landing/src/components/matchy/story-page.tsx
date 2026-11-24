'use client';

import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { APP_REGISTER_URL } from '@/lib/constants';
import { ArrowRight, Quote } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { STORY, type StoryBlock } from './story-data';

/** One block of a section: a paragraph, a stand-out sentence or a list of short lines. */
function Block({ block }: { block: StoryBlock }) {
  if (typeof block === 'string') return <p>{block}</p>;
  if ('strong' in block) return <p className="font-extrabold">{block.strong}</p>;
  return (
    <ul className="space-y-1">
      {block.lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

/**
 * /a-propos/histoire-matchy-plus/: the founders' quotes, the story in the look of /a-propos/ (dark
 * text on white), then a button for each reader: client, professional or company.
 */
export function StoryPage() {
  const { locale } = useI18n();
  const text = STORY[locale];
  const next = [
    { ...pair(text.next.find), href: localizePath(locale, '/recherche'), app: false },
    { ...pair(text.next.profile), href: APP_REGISTER_URL, app: true },
    { ...pair(text.next.build), href: localizePath(locale, '/devenir-partenaire'), app: false },
  ];

  return (
    <main className="bg-white pb-24">
      <SubpageHero eyebrow={text.eyebrow} title={text.title} subtitle={text.subtitle} />

      <article className="mx-auto -mt-16 max-w-3xl px-5">
        <figure className="relative z-10 rounded-3xl bg-white p-6 shadow-xl ring-1 shadow-[#2F76BB]/10 ring-slate-100 md:p-10">
          <Image
            src="/showcase/matchy-plus-logo.svg"
            alt=""
            width={722}
            height={184}
            unoptimized
            className="h-8 w-auto"
          />
          {/* the founders' quotes, each signed */}
          {text.quotes.map((quote) => (
            <div
              key={quote.name}
              className="mt-6 border-t border-slate-100 pt-6 first-of-type:border-0"
            >
              <Quote className="text-brand-blue/20 h-10 w-10" />
              <blockquote className="text-brand-blue mt-2 text-xl leading-snug font-extrabold text-balance md:text-2xl">
                {quote.text}
              </blockquote>
              <p className="mt-4">
                <span className="text-brand-navy block font-bold">{quote.name}</span>
                <span className="text-muted-foreground text-sm">{quote.role}</span>
              </p>
            </div>
          ))}
          <Link
            href={localizePath(locale, '/')}
            className="text-brand-blue border-brand-teal mt-6 inline-flex items-center gap-2 border-b-2 pb-0.5 font-bold"
          >
            {text.discover}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
        </figure>

        {/* the story as on /a-propos/: dark text on white, a bold heading then its paragraphs */}
        <div className="text-[#101a36]">
          {text.sections.map((section, index) => (
            <section key={section.heading ?? index} className="mt-10">
              {section.heading && (
                <h2 className="mb-2.5 text-[1.75rem] leading-tight font-extrabold">
                  {section.heading}
                </h2>
              )}
              <div className="space-y-4 leading-[1.65]">
                {section.blocks.map((block, blockIndex) => (
                  // a fixed list of blocks: their position is a stable key
                  <Block key={blockIndex} block={block} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="from-brand-navy to-brand-blue mt-16 rounded-3xl bg-gradient-to-br p-6 text-white shadow-xl md:p-10">
          <h2 className="text-2xl font-extrabold md:text-3xl">{text.nextTitle}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {next.map((item) => (
              <li key={item.label} className="flex flex-col gap-3 rounded-2xl bg-white/10 p-5">
                <p className="font-bold">{item.question}</p>
                {item.app ? (
                  <a href={item.href} className={NEXT_BUTTON}>
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href} className={NEXT_BUTTON}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}

const NEXT_BUTTON =
  'text-brand-blue mt-auto inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-center text-sm font-bold shadow-lg transition-transform hover:scale-[1.03]';

function pair([question, label]: [string, string]) {
  return { question, label };
}
