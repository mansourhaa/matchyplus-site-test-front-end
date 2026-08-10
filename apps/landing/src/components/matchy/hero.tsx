'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { motion } from 'framer-motion';
import Link from 'next/link';

import { PhoneFrame } from './phone-frame';
import { HeroScreen } from './screens';

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="from-brand-blue via-brand-blue to-brand-teal relative overflow-hidden bg-gradient-to-br">
      {/* white cut at the bottom */}
      <div
        className="bg-background absolute inset-0"
        style={{ clipPath: 'polygon(0 82%, 100% 94%, 100% 100%, 0 100%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 pt-32 pb-40 md:grid-cols-2 md:pt-40 md:pb-56">
        <div className="text-white">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-3 text-sm font-medium tracking-wide text-white/80"
          >
            {t('landing.eyebrow')}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl leading-tight font-bold text-balance md:text-5xl"
          >
            {t('landing.hero')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 max-w-md leading-relaxed text-pretty text-white/85"
          >
            {t('landing.intro')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Link
              href="/devenir-partenaire"
              className="text-brand-blue mt-8 inline-block rounded-lg bg-white px-7 py-3.5 text-sm font-semibold shadow-lg transition-transform hover:scale-[1.03]"
            >
              {t('landing.cta')}
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center md:justify-end"
        >
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          >
            <PhoneFrame>
              <HeroScreen />
            </PhoneFrame>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
