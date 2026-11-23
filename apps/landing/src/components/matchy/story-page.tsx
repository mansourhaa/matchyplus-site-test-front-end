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
  if ('strong' in block) return <p className="text-brand-navy font-bold">{block.strong}</p>;
  return (
    <ul className="space-y-1">
      {block.lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

/**
 * /a-propos/histoire-matchy-plus/: the founder's quote, the story in 3 numbered steps (the look of
 * the news articles and /utilisation/), then a button for each reader: client, professional or
 * company.
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
    <main className="bg-neutral-50/60 pb-24">
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
          <Quote className="text-brand-blue/20 mt-6 h-10 w-10" />
          <blockquote className="text-brand-blue mt-2 text-xl leading-snug font-extrabold text-balance md:text-2xl">
            {text.quote}
          </blockquote>
          <figcaption className="mt-5">
            <span className="text-brand-navy block font-bold">{text.name}</span>
            <span className="text-muted-foreground text-sm">{text.role}</span>
          </figcaption>
          <Link
            href={localizePath(locale, '/')}
            className="text-brand-blue border-brand-teal mt-6 inline-flex items-center gap-2 border-b-2 pb-0.5 font-bold"
          >
            {text.discover}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
        </figure>

        <ol className="border-brand-teal/40 relative mt-14 space-y-12 border-dashed ltr:ml-4 ltr:border-l-2 ltr:pl-8 rtl:mr-4 rtl:border-r-2 rtl:pr-8">
          {text.sections.map((section, index) => (
            <li key={section.heading} className="relative">
              <span
                aria-hidden="true"
                className="bg-brand-teal shadow-brand-teal/30 absolute grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white shadow-lg ltr:-left-[3.05rem] rtl:-right-[3.05rem]"
              >
                {index + 1}
              </span>
              <h2 className="text-brand-teal text-xl font-semibold md:text-2xl">
                {section.heading}
              </h2>
              <div className="text-muted-foreground mt-3 space-y-4 text-base leading-relaxed md:text-lg">
                {section.blocks.map((block, blockIndex) => (
                  // a fixed list of blocks: their position is a stable key
                  <Block key={blockIndex} block={block} />
                ))}
              </div>
            </li>
          ))}
        </ol>

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
