'use client';

import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { PARTNER_BENEFITS } from './partner-benefits';
import { PARTNERS } from './partners-data';

/**
 * /partenaires/: every partner (logo, name, one-line description, website), then the benefits of
 * a partnership (the same list as /devenir-partenaire/) and the way to become one.
 */
export function PartnersPage() {
  const { t, tRows, locale } = useI18n();
  const descriptions = new Map(
    tRows('landing.partnerDescriptions').map(([id, text]) => [id, text]),
  );

  return (
    <main className="bg-neutral-50/60 pb-28">
      <SubpageHero
        eyebrow={t('landing.partnersPageEyebrow')}
        title={t('landing.partnersPageTitle')}
        subtitle={t('landing.partnersPageBody')}
      />

      <div className="relative z-20 mx-auto -mt-10 max-w-5xl px-5 sm:-mt-14">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PARTNERS.map((partner) => (
            <li
              key={partner.id}
              className="flex flex-col rounded-3xl bg-white p-6 shadow-xl ring-1 shadow-[#2F76BB]/10 ring-slate-100"
            >
              <div className="grid h-28 place-items-center rounded-2xl bg-white px-4">
                <Image
                  src={partner.logo}
                  alt=""
                  width={partner.width}
                  height={partner.height}
                  sizes="240px"
                  unoptimized={partner.logo.endsWith('.svg')}
                  className="h-24 w-full object-contain"
                />
              </div>
              <h2 className="text-brand-navy mt-5 text-lg font-extrabold">{partner.name}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{descriptions.get(partner.id)}</p>
              <a
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-blue mt-4 inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
              >
                {/* the visible words start the link's name (WCAG 2.5.3), the partner follows */}
                {t('landing.partnersPageVisit')}
                <span className="sr-only"> {partner.name}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>

        <section className="mt-16">
          <h2 className="text-brand-blue text-center text-3xl font-bold">
            {t('landing.partnersPageBenefitsTitle')}
          </h2>
          <ul className="mx-auto mt-8 grid max-w-3xl gap-4">
            {PARTNER_BENEFITS[locale].map((benefit) => (
              <li
                key={benefit.title}
                className="flex items-start gap-3.5 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm"
              >
                <span className="bg-brand-teal/15 text-brand-teal mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-brand-navy font-bold">{benefit.title}</h3>
                  <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                    {benefit.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-brand-navy text-lg font-bold">{t('landing.partnersPageCtaBody')}</p>
          <Link
            href={localizePath(locale, '/devenir-partenaire')}
            className="bg-brand-blue inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.03]"
          >
            {t('landing.partnersCta')}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
        </div>
      </div>
    </main>
  );
}
