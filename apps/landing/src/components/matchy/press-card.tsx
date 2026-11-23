'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

import { type PressItem, pressDate } from './press-data';

/** Brand gradients for news without a cover, one per position so a row never looks flat. */
const COVERS = [
  'from-brand-blue to-brand-navy',
  'from-brand-navy to-brand-blue',
  'from-brand-teal to-brand-blue',
] as const;

/**
 * One Matchy+ Press card: a cover (image or brand gradient) with the date, tag, big title and
 * place, then the title, place and, on the "all news" page, a short summary. Opens the article.
 */
export function PressCard({
  item,
  index,
  withSummary = false,
  className,
}: {
  item: PressItem;
  /** Position in the list, to pick the gradient of a news item without a cover. */
  index: number;
  withSummary?: boolean;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const text = item.text[locale];
  const date = pressDate(item.date, locale);

  return (
    <Link
      href={localizePath(locale, `/actualites/${item.slug}`)}
      className={cn(
        'group focus-visible:ring-brand-teal flex flex-col overflow-hidden rounded-3xl bg-white shadow-xl ring-1 shadow-[#2F76BB]/10 ring-slate-100 transition-transform duration-300 outline-none hover:-translate-y-1 focus-visible:ring-4 motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex h-72 flex-col overflow-hidden p-5 text-white',
          !item.cover && `bg-gradient-to-br ${COVERS[index % COVERS.length]}`,
        )}
      >
        {item.cover ? (
          <>
            <Image
              src={item.cover}
              alt=""
              fill
              sizes="(min-width: 768px) 360px, 300px"
              className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
            />
            {/* keeps the white text readable on any photo */}
            <span className="from-brand-navy/90 via-brand-navy/30 absolute inset-0 bg-gradient-to-t to-transparent" />
          </>
        ) : (
          <span className="bg-brand-teal/40 absolute -top-16 -right-10 h-48 w-48 rounded-full blur-3xl rtl:right-auto rtl:-left-10" />
        )}

        <div className="relative flex items-start justify-between gap-3">
          <span className="rounded-xl bg-white px-2.5 py-1.5 text-center leading-none shadow-sm">
            <span className="text-brand-teal block text-[11px] font-bold uppercase">
              {date.top}
            </span>
            <span className="text-brand-navy block text-2xl font-extrabold">{date.big}</span>
          </span>
          <span className="text-brand-blue rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
            {text.tag}
          </span>
        </div>

        {/* the same title is the heading below: screen readers hear it once */}
        <p
          aria-hidden="true"
          className="relative mt-auto line-clamp-3 text-2xl leading-tight font-extrabold text-balance"
        >
          {text.title}
        </p>
        <p className="relative mt-2 flex items-center gap-1.5 text-sm text-white/85">
          <span className="bg-brand-teal h-1.5 w-1.5 rounded-full" />
          {text.place}
        </p>
        <p className="relative mt-3 flex items-center justify-between border-t border-white/25 pt-2 text-xs">
          {/* dir="ltr": in Arabic the "+" would jump before the name */}
          <span dir="ltr" className="font-bold">
            Matchy+
          </span>
          {item.sample && <span className="text-white/80">{t('landing.pressSample')}</span>}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-brand-navy line-clamp-2 font-bold">{text.title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {text.place} · {date.full}
        </p>
        {withSummary && (
          <p className="text-muted-foreground mt-3 line-clamp-3 text-sm leading-relaxed">
            {text.summary}
          </p>
        )}
      </div>
    </Link>
  );
}
