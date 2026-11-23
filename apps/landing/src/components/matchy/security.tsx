'use client';

import { useI18n } from '@/features/i18n/i18n-provider';

import { Parallax, Reveal } from './motion';
import { PhoneMockup } from './phone-mockup';

export function Security() {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';

  return (
    <section className="relative py-20 sm:py-24 md:py-28 lg:py-32" id="explore">
      {/* Rounded organic card shape behind the image. Its -50% lift is in the inline transform
          only: a Tailwind -translate-y-1/2 is a separate CSS property (Tailwind 4) and would lift it
          twice, over the steps text above. */}
      <div
        className={`from-brand-blue to-brand-teal pointer-events-none absolute top-1/2 z-0 h-[420px] w-[300px] rounded-[3.5rem] bg-gradient-to-br opacity-85 sm:h-[480px] sm:w-[380px] sm:rounded-[4.5rem] md:h-[540px] md:w-[420px] md:rounded-[5rem] lg:h-[620px] lg:w-[500px] lg:rounded-[5.5rem] ${
          isRtl ? 'right-0' : 'left-0'
        }`}
        style={{
          transform: isRtl
            ? 'translate(25%, -50%) rotate(20deg)'
            : 'translate(-25%, -50%) rotate(-20deg)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 lg:grid-cols-2 lg:gap-16">
        <Parallax
          speed={30}
          className="relative z-10 flex justify-center ltr:lg:justify-start rtl:lg:justify-end"
        >
          <div className="relative flex justify-center drop-shadow-2xl">
            <PhoneMockup src="/showcase/wallet-phone.png" alt={t('landing.walletImageAlt')} />
          </div>
        </Parallax>

        <Reveal
          direction={isRtl ? 'right' : 'left'}
          className="text-center ltr:lg:text-left rtl:lg:text-right"
        >
          <h2 className="text-brand-blue text-2xl font-extrabold text-balance sm:text-3xl md:text-3xl lg:text-[2.2rem] lg:leading-tight">
            {t('landing.wallet')}
            <span className="mt-1 block">{t('landing.walletSubtitle')}</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-sm leading-relaxed md:text-base ltr:lg:mr-auto ltr:lg:ml-0 rtl:lg:mr-0 rtl:lg:ml-auto">
            {t('landing.walletBody')}
          </p>
          <p className="text-muted-foreground mt-4 text-sm font-medium md:text-base">
            {t('landing.walletUsage')}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
