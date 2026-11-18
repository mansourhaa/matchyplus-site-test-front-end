'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Handshake, Megaphone, Users } from 'lucide-react';
import Link from 'next/link';

import { Reveal } from './motion';

const ICONS = [Megaphone, Users, Handshake];
const LOGO_SLOTS = 8;

/** Partnerships: what partners get, a strip of partner logos, and the way to become one. */
export function Partnerships() {
  const { t, locale } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;
  const benefits = (t('landing.partnersBenefits') as unknown as string[][]) ?? [];
  const logos = Array.from({ length: LOGO_SLOTS }, (_, index) => index);

  return (
    <section className="from-brand-blue via-brand-blue to-brand-teal relative overflow-hidden bg-gradient-to-br py-20 text-white md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="text-center">
          <div className="mx-auto mb-5 h-1 w-14 rounded-full bg-white" />
          <h2 className="text-2xl font-extrabold text-balance sm:text-3xl md:text-4xl">
            {t('landing.partnersTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">
            {t('landing.partnersBody')}
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {benefits.map(([title, text], index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <Reveal key={title} delay={index * 0.1}>
                <div className="h-full rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                  <span className="text-brand-blue grid h-11 w-11 place-items-center rounded-2xl bg-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/85">{text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* placeholder logos until real partner logos (with alt text) are provided */}
      <div className="mt-14 overflow-hidden" aria-hidden="true">
        <motion.div
          className="flex w-max gap-4"
          animate={reduceMotion ? undefined : { x: ['0%', '-50%'] }}
          transition={{ duration: 30, ease: 'linear', repeat: Number.POSITIVE_INFINITY }}
        >
          {[...logos, ...logos].map((slot, index) => (
            <span
              key={`${slot}-${index}`}
              className="grid h-16 w-44 place-items-center rounded-2xl border border-dashed border-white/40 bg-white/10 text-sm font-semibold text-white/80"
            >
              {t('landing.partnersLogo')}
            </span>
          ))}
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
