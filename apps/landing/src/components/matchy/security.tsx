'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import Image from 'next/image';

import { Parallax, Reveal } from './motion';

export function Security() {
  const { t, dir } = useI18n();
  const bullets = t('landing.walletBullets') as unknown as string[];
  const isRtl = dir === 'rtl';

  return (
    <section className="relative py-20 sm:py-24 md:py-28 lg:py-32" id="explore">
      {/* Rounded organic card shape behind the image */}
      <div
        className={`from-brand-blue to-brand-teal pointer-events-none absolute top-1/2 z-0 h-[420px] w-[300px] -translate-y-1/2 rounded-[3.5rem] bg-gradient-to-br opacity-85 sm:h-[480px] sm:w-[380px] sm:rounded-[4.5rem] md:h-[540px] md:w-[420px] md:rounded-[5rem] lg:h-[620px] lg:w-[500px] lg:rounded-[5.5rem] ${
          isRtl ? 'right-0' : 'left-0'
        }`}
        style={{
          transform: isRtl
            ? 'translate(25%, -50%) rotate(20deg)'
            : 'translate(-25%, -50%) rotate(-20deg)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 md:grid-cols-12 md:gap-8 lg:gap-14">
        <Parallax
          speed={30}
          className="relative z-10 flex justify-center md:col-span-5 lg:col-span-5 ltr:md:justify-start rtl:md:justify-end"
        >
          <div className="relative flex justify-center drop-shadow-2xl">
            <Image
              src="/showcase/wallet-phone.png"
              alt="Matchy Wallet"
              width={323}
              height={639}
              className="h-auto max-h-[480px] w-auto max-w-[280px] object-contain sm:max-w-[320px] md:max-h-[520px] md:max-w-[340px] lg:max-h-[560px] lg:max-w-[350px]"
            />
          </div>
        </Parallax>

        <Reveal
          direction={isRtl ? 'right' : 'left'}
          className="text-center md:col-span-7 lg:col-span-7 ltr:md:text-left rtl:md:text-right"
        >
          <div className="bg-brand-blue mx-auto mb-5 h-1 w-14 rounded-full ltr:md:mr-auto ltr:md:ml-0 rtl:md:mr-0 rtl:md:ml-auto" />
          <h2 className="text-brand-blue text-2xl font-extrabold text-balance sm:text-3xl md:text-3xl lg:text-[2.2rem] lg:leading-tight">
            {t('landing.wallet')}
            <span className="mt-1 block">{t('landing.walletSubtitle')}</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-sm leading-relaxed md:text-base ltr:md:mr-auto ltr:md:ml-0 rtl:md:mr-0 rtl:md:ml-auto">
            {t('landing.walletBody')}
          </p>
          <p className="text-muted-foreground mt-4 text-sm font-medium md:text-base">
            {t('landing.walletUsage')}
          </p>
          <ul className="text-muted-foreground mx-auto mt-3 max-w-md space-y-2.5 text-sm md:max-w-none md:text-base ltr:md:mr-auto ltr:md:ml-0 rtl:md:mr-0 rtl:md:ml-auto">
            {Array.isArray(bullets) &&
              bullets.map((bullet, idx) => (
                <li
                  key={idx}
                  className="flex items-start justify-center gap-2.5 ltr:md:justify-start rtl:md:justify-start"
                >
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
