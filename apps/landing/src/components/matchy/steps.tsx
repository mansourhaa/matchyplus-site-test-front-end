'use client';

import { useI18n } from '@/features/i18n/i18n-provider';

import { Reveal } from './motion';

export function Steps() {
  const { t, dir } = useI18n();
  const steps = t('landing.steps') as unknown as string[][];
  const isRtl = dir === 'rtl';

  return (
    <section
      className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 py-20 md:grid-cols-2 md:items-start"
      id="how"
    >
      <Reveal direction={isRtl ? 'left' : 'right'} className="md:sticky md:top-28">
        <div className="bg-brand-blue mb-5 h-1 w-14 rounded-full ltr:mr-auto rtl:ml-auto" />
        <h2 className="text-brand-blue text-2xl font-extrabold text-balance sm:text-3xl md:text-4xl lg:text-[2.2rem] lg:leading-tight">
          {t('landing.stepsTitle')}
          <span className="mt-1 block text-xl font-bold opacity-90 sm:text-2xl">
            {t('landing.stepsSubtitle')}
          </span>
        </h2>
        <p className="text-muted-foreground mt-5 max-w-md text-sm leading-relaxed text-pretty md:text-base">
          {t('landing.stepsBody')}
        </p>
      </Reveal>

      <ol className="border-brand-teal/40 relative space-y-10 border-dashed ltr:border-l-2 ltr:pl-8 rtl:border-r-2 rtl:pr-8">
        {Array.isArray(steps) &&
          steps.map((s, i) => (
            <Reveal key={s[0]} direction={isRtl ? 'right' : 'left'} delay={i * 0.1}>
              <li className="relative">
                <span className="bg-brand-teal shadow-brand-teal/30 absolute grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white shadow-lg ltr:-left-[3.05rem] rtl:-right-[3.05rem]">
                  {s[0]}
                </span>
                <h3 className="text-brand-teal text-lg font-semibold">{s[1]}</h3>
                <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
                  {s[2]}
                </p>
              </li>
            </Reveal>
          ))}
      </ol>
    </section>
  );
}
