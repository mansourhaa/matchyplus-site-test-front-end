'use client';

import { cn } from '@/lib/utils';
import { MotionConfig, motion, useScroll, useTransform } from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

/**
 * Fades an element out on all four sides (no visible box edge), so it melts into a white page.
 * Used by the belt floor and the community map.
 */
export const EDGE_FADE =
  '[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent),linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)] [mask-composite:intersect]';

/**
 * One rule for "reduce motion" on the whole page: framer-motion skips movement (transforms) for
 * visitors who ask for it, and keeps fades. Components never branch their markup on it (that would
 * make the server and browser HTML differ); only logic (auto-rotation, timers) checks it in JS.
 * CSS-only effects use Tailwind `motion-reduce:` / `motion-safe:`.
 */
export function ReducedMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

type Direction = 'up' | 'down' | 'left' | 'right';

const offsets: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 40 },
  down: { y: -40 },
  left: { x: 60 },
  right: { x: -60 },
};

export function Reveal({
  children,
  className,
  direction = 'up',
  delay = 0,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;
  once?: boolean;
}) {
  const initial = offsets[direction];
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...initial }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Small hook to know when we're mounted on the client. `useScroll` with a
 * target ref must run against a hydrated DOM node, so we only enable the
 * scroll-driven parallax after the first client render.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  return mounted;
}

function ParallaxInner({
  children,
  className,
  speed,
}: {
  children: ReactNode;
  className?: string;
  speed: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

/**
 * Parallax wrapper: translates its children on the Y axis as it scrolls
 * through the viewport. `speed` controls the intensity/direction.
 */
export function Parallax({
  children,
  className,
  speed = 60,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const mounted = useMounted();

  if (!mounted) {
    return <div className={cn('relative', className)}>{children}</div>;
  }

  return (
    <ParallaxInner speed={speed} className={className}>
      {children}
    </ParallaxInner>
  );
}

export { motion, useScroll, useTransform, useRef };
