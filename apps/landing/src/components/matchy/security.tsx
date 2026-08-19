'use client';

import { useI18n } from '@/features/i18n/i18n-provider';

import { Parallax, Reveal } from './motion';

export function Security() {
  const { t } = useI18n();
  const bullets = t('landing.walletBullets') as unknown as string[];

  return (
    <section className="relative py-20 sm:py-24 md:py-28 lg:py-32" id="explore">
      {/* Rounded organic card shape on the left */}
      <div
        className="from-brand-blue to-brand-teal pointer-events-none absolute top-1/2 left-0 z-0 h-[420px] w-[300px] -translate-y-1/2 rounded-[3.5rem] bg-gradient-to-br opacity-85 sm:h-[480px] sm:w-[380px] sm:rounded-[4.5rem] md:h-[540px] md:w-[420px] md:rounded-[5rem] lg:h-[620px] lg:w-[500px] lg:rounded-[5.5rem]"
        style={{ transform: 'translate(-25%, -50%) rotate(-20deg)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 md:grid-cols-12 md:gap-8 lg:gap-14">
        <Parallax speed={30} className="relative z-10 flex justify-center md:col-span-5 lg:col-span-5 md:justify-start">
          <div className="relative flex justify-center drop-shadow-2xl">
            <img
              src="/showcase/wallet-phone.png"
              alt="Matchy Wallet"
              className="h-auto max-h-[500px] w-auto max-w-[260px] object-contain sm:max-w-[300px] md:max-h-[540px] md:max-w-[290px] lg:max-h-[640px] lg:max-w-[370px]"
            />
          </div>
        </Parallax>

        <Reveal direction="left" className="text-center md:text-left md:col-span-7 lg:col-span-7">
          <div className="bg-brand-blue mx-auto mb-5 h-1 w-14 rounded-full md:mx-0" />
          <h2 className="text-brand-blue text-2xl font-extrabold text-balance sm:text-3xl md:text-3xl lg:text-[2.2rem] lg:leading-tight">
            {t('landing.wallet')}
            <span className="block mt-1">{t('landing.walletSubtitle')}</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg leading-relaxed text-sm md:mx-0 md:text-base">
            {t('landing.walletBody')}
          </p>
          <p className="text-muted-foreground mt-4 font-medium text-sm md:text-base">
            {t('landing.walletUsage')}
          </p>
          <ul className="text-muted-foreground mx-auto mt-3 max-w-md space-y-2.5 text-sm md:mx-0 md:max-w-none md:text-base">
            {Array.isArray(bullets) &&
              bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start justify-center gap-2.5 md:justify-start">
                  <span className="bg-muted-foreground mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
                  <span>{bullet}</span>
                </li>
              ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

