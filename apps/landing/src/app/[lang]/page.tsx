import { CompanyStory } from '@/components/matchy/company-story';
import { Hero } from '@/components/matchy/hero';
import { LiveCommunity } from '@/components/matchy/live-community';
import { ReducedMotion } from '@/components/matchy/motion';
import { PartnerLogos } from '@/components/matchy/partner-logos';
import { Partnerships } from '@/components/matchy/partnerships';
import { Press } from '@/components/matchy/press';
import { ProBranding } from '@/components/matchy/pro-branding';
import { ServicesBelt } from '@/components/matchy/services-belt';
import { WhyMatchy } from '@/components/matchy/why-matchy';
import { PageFrame } from '@/components/site-shell';
import { isLocale } from '@/features/i18n/routing';
import { homeJsonLd, localizedMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';
import Script from 'next/script';

export const generateMetadata = localizedMetadata('home');

// Configurable Gabster AI chatbot loader widget.
// Falls back to the production Gabster widget unless disabled via NEXT_PUBLIC_DISABLE_CHATBOT.
const CHATBOT_WIDGET_SRC =
  process.env.NEXT_PUBLIC_CHATBOT_WIDGET_SRC ||
  (process.env.NEXT_PUBLIC_GABSTER_CBID
    ? `https://widget.gabster.ai/loader?cbid=${process.env.NEXT_PUBLIC_GABSTER_CBID}`
    : 'https://widget.gabster.ai/loader?cbid=6ad89dd9d8227d15b7ec3813');
const DISABLE_CHATBOT = process.env.NEXT_PUBLIC_DISABLE_CHATBOT === 'true';

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
        {/* one "reduce motion" rule for every section (see motion.tsx) */}
        <ReducedMotion>
          {/* how Matchy+ works (features, steps, wallet, explore, download) is on /utilisation/ */}
          <Hero />
          <Press />
          <ServicesBelt />
          <WhyMatchy />
          <ProBranding />
          <LiveCommunity />
          <PartnerLogos />
          <CompanyStory />
          <Partnerships />
        </ReducedMotion>
      </main>
      {!DISABLE_CHATBOT && CHATBOT_WIDGET_SRC && (
        <Script
          data-gabster-widget=""
          src={CHATBOT_WIDGET_SRC}
          data-embed-type="widget"
          strategy="lazyOnload"
        />
      )}
    </PageFrame>
  );
}
