'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import Image from 'next/image';

import { Reveal } from './motion';
import { PARTNERS } from './partners-data';

/**
 * "Nos partenaires", right under the map (it closes that section): the partners' logos in
 * landscape cards, each opening the partner's website in a new tab.
 */
export function PartnerLogos() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-5xl px-5 pt-4 pb-16 md:pt-6 md:pb-20">
      <Reveal className="text-center">
        <p className="text-brand-teal mb-2 text-sm font-semibold tracking-wide">
          {t('landing.ourPartnersKicker')}
        </p>
        <h2 className="text-brand-blue text-3xl font-bold text-balance md:text-4xl">
          {t('landing.ourPartnersTitle')}
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed md:text-base">
          {t('landing.ourPartnersBody')}
        </p>
      </Reveal>

      <ul className="mt-10 flex flex-wrap justify-center gap-5">
        {PARTNERS.map((partner, index) => (
          <li key={partner.name}>
            <Reveal delay={index * 0.08}>
              <a
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('landing.ourPartnersVisit', { name: partner.name })}
                className="focus-visible:ring-brand-teal grid h-28 w-60 place-items-center overflow-hidden rounded-3xl bg-white px-6 py-4 shadow-xl ring-1 shadow-[#2F76BB]/10 ring-slate-100 transition-transform duration-300 outline-none hover:-translate-y-1 focus-visible:ring-4 motion-reduce:hover:translate-y-0 md:h-32 md:w-64"
              >
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  width={partner.width}
                  height={partner.height}
                  sizes="208px"
                  // SVG logos are already sharp at any size: served as they are
                  unoptimized={partner.logo.endsWith('.svg')}
                  className="h-20 w-full object-contain md:h-24"
                />
              </a>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
