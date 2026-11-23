import { Cta } from '@/components/matchy/cta';
import { Explore } from '@/components/matchy/explore';
import { Features } from '@/components/matchy/features';
import { ReducedMotion } from '@/components/matchy/motion';
import { Security } from '@/components/matchy/security';
import { Steps } from '@/components/matchy/steps';
import { UsageHero } from '@/components/matchy/usage-hero';
import { PageFrame } from '@/components/site-shell';
import { isLocale } from '@/features/i18n/routing';
import { localizedMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';

export const generateMetadata = localizedMetadata('utilisation');

/** How Matchy+ works: the sections that used to be on the home page, in the same order. */
export default async function UsagePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <PageFrame>
      <main className="bg-background overflow-x-hidden">
        <ReducedMotion>
          <UsageHero />
          <Features />
          <Steps />
          <Security />
          <Explore />
          <Cta />
        </ReducedMotion>
      </main>
    </PageFrame>
  );
}
