'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function SubpageHero({
  eyebrow = 'Matchy+',
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="from-brand-blue via-brand-blue to-brand-teal relative overflow-hidden bg-gradient-to-br pt-32 pb-24 text-white md:pt-40 md:pb-32">
      {/* Curved cut at the bottom like the home hero */}
      <div
        className="bg-background absolute inset-0"
        style={{ clipPath: 'polygon(0 84%, 100% 96%, 100% 100%, 0 100%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-4xl px-5 text-center">
        {eyebrow && (
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-3 inline-block text-xs font-bold tracking-widest text-white/80 uppercase"
          >
            {eyebrow}
          </motion.span>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl md:text-5xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-pretty text-white/90 sm:text-lg"
          >
            {subtitle}
          </motion.p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
