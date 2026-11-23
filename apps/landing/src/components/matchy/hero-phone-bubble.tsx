'use client';

import { AnimatePresence, type MotionValue, motion, useTransform } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Floating bubble beside the hero phone ("available", distance, % match). It drifts with the
 * pointer (`depth`, px), bobs gently (`float`, seconds per cycle) and pops in again when `id`
 * changes.
 */
export function Bubble({
  className,
  depth,
  float,
  pointerX,
  id,
  icon,
  iconClass,
  children,
}: {
  className: string;
  depth: number;
  float: number;
  pointerX: MotionValue<number>;
  id: string;
  icon: ReactNode;
  iconClass: string;
  children: ReactNode;
}) {
  const x = useTransform(pointerX, [-1, 1], [-depth, depth]);
  return (
    <motion.div
      aria-hidden="true"
      className={`absolute z-20 ${className}`}
      style={{ x }}
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: float, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={id}
          className="text-brand-navy flex items-center gap-2 rounded-2xl border border-white/60 bg-white/90 py-1.5 ps-1.5 pe-3 text-[11px] font-bold whitespace-nowrap shadow-xl shadow-black/10 backdrop-blur-md sm:text-xs"
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${iconClass}`}
          >
            {icon}
          </span>
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
