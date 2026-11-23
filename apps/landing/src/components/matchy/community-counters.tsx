'use client';

import { motion } from 'framer-motion';

/** One counter of the map: a real Search Console figure. */
export type CommunityMetric = {
  label: string;
  value: number;
  /** The headline counter (countries): bigger, teal, with a pulsing dot. */
  headline: boolean;
};

/**
 * Where the counters float on the map on computers, in % (left / top), over open ocean: no land
 * or highlighted country under them. Same order as the counters: countries (the headline number)
 * over the South Pacific, Google appearances over the Indian Ocean.
 */
const STAT_SPOTS = [
  { left: 5, top: 62, centered: false },
  { left: 64, top: 61, centered: false },
] as const;

/** Counters floating over the oceans of the map, on computers only. */
export function FloatingCounters({
  metrics,
  format,
  dir,
}: {
  metrics: CommunityMetric[];
  format: Intl.NumberFormat;
  /** Page direction: the map is left-to-right, the counter's text follows the page language. */
  dir: 'ltr' | 'rtl';
}) {
  return metrics.map((metric, index) => (
    <motion.div
      key={metric.label}
      // Tailwind's translate and framer's transform are separate CSS properties; max-w-52 makes a
      // long label wrap over the ocean instead of running onto land
      className={`pointer-events-none absolute z-10 hidden max-w-52 md:block ${STAT_SPOTS[index].centered ? '-translate-x-1/2 text-center' : ''}`}
      style={{
        left: `${STAT_SPOTS[index].left}%`,
        top: `${STAT_SPOTS[index].top}%`,
      }}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.6, delay: 0.3 + index * 0.2, ease: 'easeOut' }}
    >
      <motion.dl
        dir={dir}
        animate={{ y: [0, -6, 0] }}
        transition={{
          duration: 5,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
          delay: index * 0.8,
        }}
      >
        <Stat {...metric} format={format} centered={STAT_SPOTS[index].centered} />
      </motion.dl>
    </motion.div>
  ));
}

/** The same counters in a row under the map, on phones only. */
export function CounterRow({
  metrics,
  format,
}: {
  metrics: CommunityMetric[];
  format: Intl.NumberFormat;
}) {
  return (
    <div className="mt-6 grid grid-cols-2 divide-x divide-slate-200 text-center md:hidden rtl:divide-x-reverse">
      {metrics.map((metric) => (
        <dl key={metric.label} className="px-2">
          <Stat {...metric} format={format} centered />
        </dl>
      ))}
    </div>
  );
}

/**
 * One counter: label, then the number. The headline one (countries) is bigger and teal, with a
 * pulsing dot.
 */
function Stat({
  label,
  value,
  headline,
  format,
  centered = false,
}: {
  label: string;
  value: number;
  headline: boolean;
  format: Intl.NumberFormat;
  centered?: boolean;
}) {
  return (
    <>
      <dt
        className={`flex items-center gap-1.5 text-[10px] leading-tight font-bold text-slate-500 uppercase sm:text-xs sm:tracking-wide ${centered ? 'justify-center' : ''}`}
      >
        {headline && (
          <span className="bg-brand-teal h-1.5 w-1.5 shrink-0 rounded-full motion-safe:animate-pulse" />
        )}
        {label}
      </dt>
      <dd
        className={`mt-1 font-extrabold tabular-nums [text-shadow:0_0_16px_#F7FAFD] ${headline ? 'text-brand-teal text-3xl md:text-6xl' : 'text-brand-blue text-2xl md:text-4xl'}`}
      >
        {format.format(value)}
      </dd>
    </>
  );
}
