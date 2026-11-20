'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import type { BeltService } from './belt-data';

/**
 * Belt mode overlay: the trade in front (with its position on the belt) and, on wide screens,
 * the "in this service" card with its button to open the profile card.
 */
export function BeltServiceInfo({
  service,
  position,
  count,
  onOpen,
}: {
  service: BeltService;
  /** Index of the trade in front (0-based). */
  position: number;
  count: number;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none absolute inset-x-5 bottom-5 z-[400] flex items-end justify-between gap-6"
    >
      <div className="min-w-0">
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-wider uppercase">
          <span className="bg-brand-teal h-2 w-2 rounded-full motion-safe:animate-pulse" />
          {t('landing.beltRunning')}
          <span dir="ltr" className="bg-brand-navy rounded px-1.5 text-white">
            {String(position + 1).padStart(2, '0')}
          </span>
          <span dir="ltr">/ {String(count).padStart(2, '0')}</span>
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={service.code}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="text-brand-blue truncate text-4xl leading-none font-extrabold md:text-6xl"
          >
            {service.title}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="pointer-events-auto hidden w-72 shrink-0 rounded-2xl border border-black/5 bg-white/90 p-4 shadow-xl shadow-black/5 backdrop-blur md:block">
        <p className="text-muted-foreground flex justify-between border-b border-black/5 pb-2 font-mono text-[10px] tracking-wider uppercase">
          <span>{t('landing.beltInService')}</span>
          <span dir="ltr">{service.code}</span>
        </p>
        <ul className="divide-y divide-black/5">
          {service.items.map((item) => (
            <li key={item} className="text-brand-navy py-2 text-sm font-semibold">
              {item}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onOpen}
          className="bg-brand-blue hover:bg-brand-navy focus-visible:ring-brand-teal mt-2 flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          {t('landing.beltOpenCard')}
          <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </button>
      </div>
    </motion.div>
  );
}
