'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { motion } from 'framer-motion';
import { ArrowRight, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from './motion';
import { PARTNERS, type Partner } from './partners-data';

/** Strip slots: each partner's logo, then a free place to take ("Votre marque ici"). */
const SLOTS: (Partner | 'free')[] = PARTNERS.flatMap((partner) => [partner, 'free' as const]);

/**
 * "Ils avancent avec Matchy+": a sliding strip that mixes the real partners' logos with free
 * places ("Votre marque ici", linking to the partner page), and the way to become one.
 */
export function Partnerships() {
  const { t, locale } = useI18n();

  return (
    <section className="from-brand-blue via-brand-blue to-brand-teal relative overflow-hidden bg-gradient-to-br py-20 text-white md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="text-center">
          {/* centred heading, same as features / belt / map (white bar on the dark band) */}
          <h2 className="text-3xl font-bold text-balance md:text-4xl">
            {t('landing.partnersTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">
            {t('landing.partnersBody')}
          </p>
        </Reveal>
      </div>

      {/*
        Decorative strip, shown twice for a seamless loop: hidden from screen readers and out of
        the tab order (the "Devenir partenaire" button below is the accessible way in).
        The partners' names are in "Nos partenaires" under the map, so the logos here have no alt.
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
                className="grid h-44 w-56 shrink-0 place-items-center rounded-3xl bg-white p-6 shadow-xl shadow-black/10"
              >
                <Image
                  src={slot.logo}
                  alt=""
                  width={slot.width}
                  height={slot.height}
                  sizes="176px"
                  unoptimized={slot.logo.endsWith('.svg')}
                  className="h-32 w-full object-contain"
                />
              </span>
            ) : (
              <Link
                key={index}
                href={localizePath(locale, '/devenir-partenaire')}
                tabIndex={-1}
                className="group flex h-44 w-56 shrink-0 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/50 bg-white/10 transition-colors hover:bg-white/20"
              >
                <span className="text-brand-blue grid h-16 w-16 place-items-center rounded-full bg-white shadow-lg transition-transform group-hover:scale-110">
                  <Plus className="h-7 w-7" />
                </span>
                <span className="font-bold">{t('landing.partnersSlot')}</span>
              </Link>
            ),
          )}
        </motion.div>
      </div>

      <div className="mt-12 text-center">
        <Link
          href={localizePath(locale, '/devenir-partenaire')}
          className="text-brand-blue inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-bold shadow-xl transition-transform hover:scale-[1.03]"
        >
          {t('landing.partnersCta')}
          <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </section>
  );
}
