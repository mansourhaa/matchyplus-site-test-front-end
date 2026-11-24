'use client';

import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { APP_REGISTER_URL } from '@/lib/constants';
import Link from 'next/link';

import { STORY, type StoryBlock } from './story-data';

/** A paragraph of the document: words between `**` are bold, as in the document. */
function Rich({ text }: { text: string }) {
  return text.split('**').map((piece, index) =>
    // odd pieces sit between two `**`; a fixed text, so the position is a stable key
    index % 2 === 1 ? <strong key={index}>{piece}</strong> : piece,
  );
}

/** One block: a paragraph, a stand-out sentence or a founder's quote, signed. */
function Block({ block }: { block: StoryBlock }) {
  if (typeof block === 'string')
    return (
      <p>
        <Rich text={block} />
      </p>
    );
  if ('quote' in block) return <blockquote className={QUOTE}>{block.quote}</blockquote>;
  return (
    <figure>
      <blockquote className={QUOTE}>{block.founder.text}</blockquote>
      <figcaption className="mt-4">
        <span className="block font-bold">{block.founder.name}</span>
        <span className="text-muted-foreground italic">{block.founder.role}</span>
      </figcaption>
    </figure>
  );
}

/**
 * /a-propos/histoire-matchy-plus/: the "Story Matchy 3" document in the look of /a-propos/ (dark
 * text on white, no boxes): its parts in order, separated by a thin line, then a button for each
 * reader: client, professional or company.
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
      <SubpageHero eyebrow={text.eyebrow} title={text.title} />

      <article className="mx-auto max-w-3xl px-5 pt-4 text-[#101a36]">
        {text.parts.map((part, index) => (
          // a fixed list of parts: their position is a stable key
          <section key={part.heading ?? index}>
            {part.heading && (
              <h2 className="mb-2.5 text-[1.75rem] leading-tight font-extrabold">{part.heading}</h2>
            )}
            <div className="space-y-4 leading-[1.65]">
              {part.blocks.map((block, blockIndex) => (
                <Block key={blockIndex} block={block} />
              ))}
            </div>
            <hr className="my-10 border-slate-200" />
          </section>
        ))}

        <section>
          <h2 className="mb-6 text-[1.75rem] leading-tight font-extrabold">{text.nextTitle}</h2>
          <ul className="grid gap-8 md:grid-cols-3">
            {next.map((item) => (
              <li key={item.label} className="flex flex-col gap-3">
                <p className="leading-[1.65]">{item.question}</p>
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

/** A quote or stand-out sentence: bold, with the brand bar on its side (as in the document). */
const QUOTE = 'border-brand-teal border-s-4 ps-5 text-lg leading-[1.65] font-semibold';

const NEXT_BUTTON =
  'bg-brand-blue hover:bg-brand-navy mt-auto inline-flex items-center justify-center rounded-full px-5 py-2.5 text-center text-sm font-bold text-white shadow-lg transition-colors';

function pair([question, label]: [string, string]) {
  return { question, label };
}
