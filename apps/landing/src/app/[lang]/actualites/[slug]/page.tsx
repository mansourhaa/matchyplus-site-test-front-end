import { ReducedMotion } from '@/components/matchy/motion';
import { pressItem, pressItems } from '@/components/matchy/press-data';
import { PressArticle } from '@/components/matchy/press-pages';
import { PageFrame } from '@/components/site-shell';
import { isLocale } from '@/features/i18n/routing';
import { pressMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type PressParams = { params: Promise<{ lang: string; slug: string }> };

// one page per news item and language, built ahead of time; any other slug is a 404
export const dynamicParams = false;

export function generateStaticParams() {
  return pressItems().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PressParams): Promise<Metadata> {
  const { lang, slug } = await params;
  const item = pressItem(slug);
  return isLocale(lang) && item ? pressMetadata(lang, item) : {};
}

export default async function PressArticlePage({ params }: PressParams) {
  const { lang, slug } = await params;
  if (!isLocale(lang) || !pressItem(slug)) notFound();

  return (
    <PageFrame>
      <ReducedMotion>
        <PressArticle slug={slug} />
      </ReducedMotion>
    </PageFrame>
  );
}
