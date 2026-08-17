'use client';

import { Cta } from '@/components/matchy/cta';
import { Explore } from '@/components/matchy/explore';
import { Features } from '@/components/matchy/features';
import { Hero } from '@/components/matchy/hero';
import { Security } from '@/components/matchy/security';
import { Steps } from '@/components/matchy/steps';
import { PageFrame } from '@/components/site-shell';

export default function Page() {
  return (
    <PageFrame>
      <main className="bg-background overflow-x-hidden">
        <Hero />
        <Features />
        <Security />
        <Explore />
        <Steps />
        <Cta />
      </main>
    </PageFrame>
  );
}
