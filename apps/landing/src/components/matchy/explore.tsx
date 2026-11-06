'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import Image from 'next/image';

import { Parallax, Reveal } from './motion';

export function Explore() {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';

  return (
    <section className="relative py-20 sm:py-24 md:py-28 lg:py-32" id="explore-map">
      {/* Rounded organic card shape on the background */}
      <div
        className={`from-brand-blue to-brand-teal pointer-events-none absolute bottom-0 z-0 h-[420px] w-[300px] rounded-[3.5rem] bg-gradient-to-br opacity-85 sm:h-[480px] sm:w-[380px] sm:rounded-[4.5rem] md:h-[540px] md:w-[420px] md:rounded-[5rem] lg:h-[620px] lg:w-[500px] lg:rounded-[5.5rem] ${
          isRtl ? 'left-0' : 'right-0'
        }`}
        style={{
          transform: isRtl
            ? 'translate(-20%, 15%) rotate(-20deg)'
            : 'translate(20%, 15%) rotate(20deg)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 md:grid-cols-12 md:gap-8 lg:gap-14">
        <Reveal
          direction={isRtl ? 'left' : 'right'}
          className="text-center md:col-span-6 lg:col-span-5 ltr:md:text-left rtl:md:text-right"
        >
          <div className="bg-brand-blue mx-auto mb-5 h-1 w-14 rounded-full ltr:md:mr-auto ltr:md:ml-0 rtl:md:mr-0 rtl:md:ml-auto" />
          <h2 className="text-brand-blue text-2xl font-extrabold text-balance sm:text-3xl md:text-3xl lg:text-[1.9rem] lg:leading-tight">
            <span className="block lg:whitespace-nowrap">{t('landing.exploreTitle')}</span>
            <span className="block">{t('landing.exploreTitleLine2')}</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-sm leading-relaxed md:text-base ltr:md:mr-auto ltr:md:ml-0 rtl:md:mr-0 rtl:md:ml-auto">
            {t('landing.exploreBody')}
          </p>
        </Reveal>

        <Parallax
          speed={25}
          className="relative z-10 flex justify-center md:col-span-6 lg:col-span-7"
        >
          <div className="relative flex w-full justify-center drop-shadow-2xl">
            <Image
              src="/showcase/explore-map.png"
              alt={t('landing.exploreImageAlt')}
              width={736}
              height={560}
              sizes="(max-width: 640px) 320px, (max-width: 768px) 400px, (max-width: 1024px) 460px, 580px"
              className="h-auto w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px] lg:max-w-[540px] xl:max-w-[580px] object-contain"
            />
          </div>
        </Parallax>
      </div>
    </section>
  );
}
