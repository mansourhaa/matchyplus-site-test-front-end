'use client';

import { Cta } from '@/components/matchy/cta';
import { Explore } from '@/components/matchy/explore';
import { Features } from '@/components/matchy/features';
import { Hero } from '@/components/matchy/hero';
import { Security } from '@/components/matchy/security';
import { Steps } from '@/components/matchy/steps';
import { PageFrame } from '@/components/site-shell';
import Script from 'next/script';

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
      <Script
        data-gabster-widget=""
        src="https://widget.gabster.ai/loader?cbid=6ad89dd9d8227d15b7ec3813"
        data-embed-type="widget"
      />
    </PageFrame>
  );
}
