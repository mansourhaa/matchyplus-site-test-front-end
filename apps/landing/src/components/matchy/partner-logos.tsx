'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import Image from 'next/image';

import { Reveal } from './motion';

/** Matchy+'s real partners. To add one: put its logo in public/matchy/partners/ (square, .webp). */
const PARTNERS = [
  { name: 'DOT-IT', logo: '/matchy/partners/dotit.webp', url: 'https://www.dotit-tn.com/fr' },
  {
    name: 'GoPayzi',
    logo: '/matchy/partners/gopayzi.webp',
    url: 'https://pitchbook.com/profiles/company/494307-91',
  },
  {
    name: 'TCA – Tunisie Commissariat aux Comptes',
    logo: '/matchy/partners/tca.webp',
    url: 'https://tcasamitouzi.com/',
  },
] as const;

/** "Nos partenaires": the partners' logos, each opening the partner's website in a new tab. */
export function PartnerLogos() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-5xl px-5 py-16 md:py-20">
      <Reveal className="text-center">
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
                className="focus-visible:ring-brand-teal grid h-36 w-36 place-items-center overflow-hidden rounded-3xl bg-white p-3 shadow-xl ring-1 shadow-[#2F76BB]/10 ring-slate-100 transition-transform duration-300 outline-none hover:-translate-y-1 focus-visible:ring-4 motion-reduce:hover:translate-y-0 md:h-40 md:w-40"
              >
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  width={160}
                  height={160}
                  sizes="160px"
                  className="h-full w-full rounded-2xl object-contain"
                />
              </a>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
