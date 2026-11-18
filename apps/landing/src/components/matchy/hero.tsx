'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { motion } from 'framer-motion';

import { HeroLivePhone } from './hero-live-phone';
import { HeroSearch } from './hero-search';

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

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 pt-32 pb-36 md:grid-cols-2 md:gap-8 md:pt-36 md:pb-48 lg:pt-40 lg:pb-56">
        <div className="text-center text-white ltr:md:text-left rtl:md:text-right">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-sm font-semibold text-white backdrop-blur-md"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ADE80] opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
            </span>
            {t('landing.heroLive')}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-3xl leading-tight font-bold text-balance sm:text-4xl md:text-4xl lg:text-[2.6rem]"
          >
            <span className="block lg:whitespace-nowrap">{t('landing.hero')}</span>
            <span className="block">{t('landing.heroLine2')}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-pretty text-white/85 sm:text-base ltr:md:mr-auto ltr:md:ml-0 rtl:md:mr-0 rtl:md:ml-auto"
          >
            {t('landing.intro')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex justify-center ltr:md:justify-start rtl:md:justify-start"
          >
            <HeroSearch />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center ltr:md:justify-end rtl:md:justify-start"
        >
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            className="relative flex justify-center drop-shadow-2xl"
          >
            <HeroLivePhone alt={t('landing.heroImageAlt')} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
