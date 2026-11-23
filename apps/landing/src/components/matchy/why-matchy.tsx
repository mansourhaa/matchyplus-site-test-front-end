'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { Check, X } from 'lucide-react';
import Image from 'next/image';

import { Reveal } from './motion';

/** "Before / with Matchy+" comparison: finding a pro today vs with Matchy+. */
export function WhyMatchy() {
  const { t, tList } = useI18n();
  const before = tList('landing.whyBefore');
  const after = tList('landing.whyAfter');

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-24">
      <Reveal className="text-center">
        {/* centred heading, same as features / belt / map */}
        <h2 className="text-brand-blue text-3xl font-bold text-balance md:text-4xl">
          {t('landing.whyTitle')}
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed md:text-base">
          {t('landing.whyBody')}
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <Reveal className="rounded-[2rem] border border-slate-200 bg-slate-50 p-7 md:p-9">
          <h3 className="text-xl font-extrabold text-slate-500 md:text-2xl">
            {t('landing.whyBeforeTitle')}
          </h3>
          <ul className="mt-6 space-y-4">
            {before.map((item, index) => (
              <li key={item}>
                <Reveal delay={index * 0.06} className="flex items-center gap-3 text-slate-600">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-red-500">
                    <X className="h-4 w-4" strokeWidth={3} />
                  </span>
                  {item}
                </Reveal>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal
          delay={0.1}
          className="from-brand-blue to-brand-teal relative overflow-hidden rounded-[2rem] bg-gradient-to-br p-7 text-white shadow-2xl shadow-[#2F76BB]/25 md:p-9"
        >
          <div className="relative z-10 max-w-md">
            <h3 className="text-xl font-extrabold md:text-2xl">{t('landing.whyAfterTitle')}</h3>
            <ul className="mt-6 space-y-4">
              {after.map((item, index) => (
                <li key={item}>
                  <Reveal
                    delay={0.15 + index * 0.06}
                    className="flex items-center gap-3 font-semibold"
                  >
                    <span className="text-brand-blue grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                    {item}
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
          <Image
            src="/showcase/hero-phone.png"
            alt=""
            width={323}
            height={639}
            sizes="220px"
            className="pointer-events-none absolute -bottom-24 hidden w-[220px] rotate-[8deg] drop-shadow-2xl md:block ltr:right-6 rtl:left-6 rtl:-rotate-[8deg]"
          />
        </Reveal>
      </div>
    </section>
  );
}
