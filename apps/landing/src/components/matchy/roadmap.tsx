'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { APP_REGISTER_URL } from '@/lib/constants';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Reveal } from './motion';

/**
 * Last home section, "Matchy+ avance avec sa communauté": the five steps of the roadmap, in
 * order (a row on computers, a column on phones), and a link to join. Steps have no status or
 * dates on purpose: the content brief gives none.
 */
export function Roadmap() {
  const { t, tList } = useI18n();
  const steps = tList('landing.roadmapSteps');

  return (
    <section className="from-brand-blue via-brand-blue to-brand-teal relative overflow-hidden bg-gradient-to-br py-20 text-white md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold text-balance md:text-4xl">
            {t('landing.roadmapTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">
            {t('landing.roadmapBody')}
          </p>
        </Reveal>

        <ol className="relative mx-auto mt-14 grid max-w-xs gap-8 md:max-w-none md:grid-cols-5 md:gap-4">
          {/* the line joining the steps: vertical on phones, horizontal on computers */}
          <span
            aria-hidden="true"
            className="absolute top-6 bottom-6 w-0.5 bg-white/30 md:top-6 md:right-[10%] md:bottom-auto md:left-[10%] md:h-0.5 md:w-auto ltr:left-6 rtl:right-6 md:rtl:right-[10%] md:rtl:left-[10%]"
          />
          {steps.map((step, index) => (
            <li key={step} className="relative">
              <Reveal
                delay={index * 0.08}
                className="flex items-center gap-4 md:flex-col md:text-center"
              >
                <span className="text-brand-blue relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-lg font-extrabold shadow-lg">
                  {index + 1}
                </span>
                <span className="text-sm leading-snug font-bold md:text-base">{step}</span>
              </Reveal>
            </li>
          ))}
        </ol>

        <div className="mt-14 text-center">
          <Link
            href={APP_REGISTER_URL}
            className="text-brand-blue inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold shadow-lg transition-transform hover:-translate-y-0.5 md:text-base"
          >
            {t('landing.roadmapCta')}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
        </div>
      </div>
    </section>
  );
}
