import { Cta } from '@/components/matchy/cta';
import { Explore } from '@/components/matchy/explore';
import { Features } from '@/components/matchy/features';
import { Hero } from '@/components/matchy/hero';
import { Security } from '@/components/matchy/security';
import { Steps } from '@/components/matchy/steps';
import { PageFrame } from '@/components/site-shell';
import { isLocale } from '@/features/i18n/routing';
import { homeJsonLd, localizedMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';
import Script from 'next/script';

export const generateMetadata = localizedMetadata('home');

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <PageFrame>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd(lang)) }}
      />
      <main className="bg-background overflow-x-hidden">
        <Hero />
        <Features />
        <Security />
        <Explore />
        <Steps />
        <Cta />
      </main>
      <Script
        data-gabster-widget=""
        src="https://widget.gabster.ai/loader?cbid=6ad89dd9d8227d15b7ec3813"
        data-embed-type="widget"
        strategy="lazyOnload"
      />
    </PageFrame>
  );
}
