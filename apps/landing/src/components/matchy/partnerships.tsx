'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { motion } from 'framer-motion';
import { ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';

import { Reveal } from './motion';

/** Strip slots: a partner logo, then a free place to take, and so on. */
const SLOTS = ['logo', 'free', 'logo', 'free', 'logo', 'free', 'logo', 'free'] as const;

/**
 * Partnerships: a sliding strip that mixes partner logos with free places ("Votre marque ici",
 * linking to the partner page), and the way to become one.
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
        Logos are placeholders until real partner logos (with alt text) are provided.
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
            slot === 'logo' ? (
              <span
                key={index}
                className="grid h-44 w-56 shrink-0 place-items-center rounded-3xl bg-white shadow-xl shadow-black/10"
              >
                <span className="grid h-24 w-24 place-items-center rounded-2xl border border-slate-100 bg-slate-50 px-2 text-center text-xs font-semibold text-slate-400">
                  {t('landing.partnersLogo')}
                </span>
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
