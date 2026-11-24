'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { motion } from 'framer-motion';
import { ArrowRight, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from './motion';
import { NETWORK_PARTNERS, type Partner } from './partners-data';

/**
 * Strip slots: each partner's logo, then a free place to take ("Votre marque ici"), repeated until
 * one round is wider than a large screen (at least 8 cards), so the loop never shows a gap.
 */
const ROUND: (Partner | 'free')[] = NETWORK_PARTNERS.flatMap((partner) => [
  partner,
  'free' as const,
]);
const SLOTS = Array.from({ length: Math.ceil(8 / ROUND.length) }, () => ROUND).flat();

/**
 * "Ils avancent avec Matchy+": a sliding strip that mixes the real partners' logos with free
 * places ("Votre marque ici", linking to the partner page), and the way to become one.
 */
export function Partnerships() {
  const { t, locale } = useI18n();

  return (
    // white, like the map just above it
    <section className="relative overflow-hidden bg-white py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="text-center">
          {/* centred heading, same as features / belt / map */}
          <h2 className="text-brand-blue text-3xl font-bold text-balance md:text-4xl">
            {t('landing.partnersTitle')}
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed md:text-base">
            {t('landing.partnersBody')}
          </p>
        </Reveal>
      </div>

      {/*
        Decorative strip, shown twice for a seamless loop: hidden from screen readers and out of
        the tab order (the "Devenir partenaire" button below is the accessible way in).
        The partners' names are on /partenaires/ (the "Devenir partenaire" link of the footer), so
        the logos here have no alt.
      */}
      <div
        className="mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
        aria-hidden="true"
        // the loop slides left in every language; in RTL it would leave a gap on the right
        dir="ltr"
      >
        <motion.div
          className="flex w-max gap-5 py-2"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 40, ease: 'linear', repeat: Number.POSITIVE_INFINITY }}
        >
          {[...SLOTS, ...SLOTS].map((slot, index) =>
            slot !== 'free' ? (
              <span
                key={index}
                className={`grid h-44 w-56 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 ${slot.cover ? '' : 'p-6'}`}
              >
                <Image
                  src={slot.logo}
                  alt=""
                  width={slot.width}
                  height={slot.height}
                  sizes="176px"
                  unoptimized={slot.logo.endsWith('.svg')}
                  className={slot.cover ? 'h-44 w-full object-cover' : 'h-32 w-full object-contain'}
                  style={slot.cover ? { objectPosition: slot.cover } : undefined}
                />
              </span>
            ) : (
              <Link
                key={index}
                href={localizePath(locale, '/devenir-partenaire')}
                tabIndex={-1}
                className="group border-brand-blue/30 bg-brand-blue/[0.04] hover:bg-brand-blue/[0.08] flex h-44 w-56 shrink-0 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed transition-colors"
              >
                <span className="bg-brand-blue grid h-16 w-16 place-items-center rounded-full text-white transition-transform group-hover:scale-110">
                  <Plus className="h-7 w-7" />
                </span>
                <span className="text-brand-navy font-bold">{t('landing.partnersSlot')}</span>
              </Link>
            ),
          )}
        </motion.div>
      </div>

      <div className="mt-12 text-center">
        <Link
          href={localizePath(locale, '/devenir-partenaire')}
          className="bg-brand-blue inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-bold text-white shadow-xl transition-transform hover:scale-[1.03]"
        >
          {t('landing.partnersCta')}
          <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </section>
  );
}
