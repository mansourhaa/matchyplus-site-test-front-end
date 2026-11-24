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
        {/* one "reduce motion" rule for every section (see motion.tsx) */}
        <ReducedMotion>
          {/* how Matchy+ works (features, steps, wallet, explore, download) is on /utilisation/ */}
          <Hero />
          <Press />
          <LiveCommunity />
          <Partnerships />
          <WhyMatchy />
          <ProBranding />
          <ServicesBelt />
          <CompanyStory />
          <PartnerLogos />
        </ReducedMotion>
      </main>
    </PageFrame>
  );
}
