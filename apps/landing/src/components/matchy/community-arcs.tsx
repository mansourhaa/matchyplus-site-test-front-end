'use client';

import { motion } from 'framer-motion';

import { type CommunityLocation, MAP_HEIGHT, MAP_WIDTH, arcPath } from './community-map';

/** Lines from Tunis: each takes ARC_DRAW s to draw, one starts every ARC_STAGGER s. */
const ARC_DRAW = 1.6;
const ARC_FADE = 0.8;
const ARC_STAGGER = 0.7;

/** Curved lines from the hub (Tunis) to every other city, drawn one after another, in a loop. */
export function CommunityArcs({
  hub,
  routes,
}: {
  hub: CommunityLocation;
  routes: readonly CommunityLocation[];
}) {
  // every line waits for the others before drawing again
  const arcPause = (routes.length - 1) * ARC_STAGGER + 1;
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className="pointer-events-none absolute inset-0 h-full w-full motion-reduce:hidden"
    >
      {routes.map((route, index) => (
        <motion.path
          key={route.id}
          d={arcPath(hub, route)}
          fill="none"
          stroke="#49B8AD"
          strokeWidth={1.6}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0, 0.9, 0] }}
          transition={{
            duration: ARC_DRAW + ARC_FADE,
            times: [0, ARC_DRAW / (ARC_DRAW + ARC_FADE), 1],
            delay: index * ARC_STAGGER,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: arcPause,
            ease: 'easeInOut',
          }}
        />
      ))}
    </svg>
  );
}
