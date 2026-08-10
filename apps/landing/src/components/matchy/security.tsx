'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { Check } from 'lucide-react';

import { Parallax, Reveal } from './motion';
import { PhoneFrame } from './phone-frame';
import { FaceScanScreen } from './screens';

export function Security() {
  const { t } = useI18n();
  const bullets = t('landing.walletBullets') as unknown as string[];

  return (
    <section className="relative overflow-hidden py-20" id="explore">
      {/* brand accent shape */}
      <div
        className="from-brand-blue to-brand-teal pointer-events-none absolute top-1/2 left-0 z-0 h-72 w-72 -translate-x-1/3 -translate-y-1/2 rounded-[3rem] bg-gradient-to-br opacity-20"
        style={{ transform: 'translate(-30%, -50%) rotate(20deg)' }}
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 md:grid-cols-2">
        <Parallax speed={50} className="flex justify-center md:justify-start">
          <PhoneFrame dark>
            <FaceScanScreen />
          </PhoneFrame>
        </Parallax>

        <Reveal direction="left">
          <div className="bg-brand-teal mb-5 h-1 w-10 rounded" />
          <h2 className="text-brand-blue text-3xl font-bold text-balance md:text-4xl">
            {t('landing.wallet')}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-lg leading-relaxed text-pretty">
            {t('landing.walletBody')}
          </p>
          <ul className="text-muted-foreground mt-6 space-y-3 text-sm">
            {Array.isArray(bullets) &&
              bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <Check className="text-brand-teal h-5 w-5 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
