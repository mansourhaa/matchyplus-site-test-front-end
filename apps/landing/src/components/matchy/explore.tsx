'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

import { Reveal, motion, useMounted, useScroll, useTransform } from './motion';
import { PhoneFrame } from './phone-frame';
import { ExploreScreen, ProfileScreen } from './screens';

function CascadingPhones() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const yFront = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const yBack = useTransform(scrollYProgress, [0, 1], [-40, 40]);

  return (
    <div ref={ref} className="relative flex min-h-[440px] items-center justify-center">
      <motion.div style={{ y: yFront }} className="relative z-10">
        <PhoneFrame className="rotate-[-4deg]">
          <ExploreScreen />
        </PhoneFrame>
      </motion.div>
      <motion.div
        style={{ y: yBack }}
        className="absolute top-16 right-0 z-20 hidden scale-90 sm:block"
      >
        <PhoneFrame className="rotate-[6deg]">
          <ProfileScreen />
        </PhoneFrame>
      </motion.div>
    </div>
  );
}

function StaticPhones() {
  return (
    <div className="relative flex min-h-[440px] items-center justify-center">
      <div className="relative z-10">
        <PhoneFrame className="rotate-[-4deg]">
          <ExploreScreen />
        </PhoneFrame>
      </div>
      <div className="absolute top-16 right-0 z-20 hidden scale-90 sm:block">
        <PhoneFrame className="rotate-[6deg]">
          <ProfileScreen />
        </PhoneFrame>
      </div>
    </div>
  );
}

export function Explore() {
  const mounted = useMounted();
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden bg-neutral-50/50 py-20">
      <div
        className="from-brand-teal to-brand-blue pointer-events-none absolute top-1/3 right-0 z-0 h-80 w-80 translate-x-1/3 rounded-[3rem] bg-gradient-to-br opacity-20"
        style={{ transform: 'translateX(35%) rotate(-15deg)' }}
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 md:grid-cols-2">
        <Reveal direction="right">
          <div className="bg-brand-teal mb-5 h-1 w-10 rounded" />
          <h2 className="text-brand-blue text-3xl font-bold text-balance md:text-4xl">
            {t('landing.exploreTitle')}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-lg leading-relaxed text-pretty">
            {t('landing.exploreBody')}
          </p>
          <div className="mt-8">
            <Link
              href="/devenir-partenaire"
              className="text-brand-teal inline-flex items-center gap-2 text-sm font-semibold hover:underline"
            >
              {t('landing.discoverMore')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        {mounted ? <CascadingPhones /> : <StaticPhones />}
      </div>
    </section>
  );
}
