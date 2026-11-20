'use client';

import { AnimatePresence, motion } from 'framer-motion';

import type { CommunityLocation } from './community-map';

/**
 * One city on the map: a pulsing point (bigger and blue for the hub), and a ring with "+1" when
 * a visitor arrives. Hover reacts only to a real mouse: on phones the tap opens the tooltip, and
 * the map sliding under the finger must not close it.
 */
export function CommunityMarker({
  location,
  index,
  label,
  selected,
  hub,
  arrivalKey,
  onShow,
  onHide,
  onTap,
}: {
  location: CommunityLocation;
  /** Position in the list, to offset the pulse of each point. */
  index: number;
  /** Accessible name: city and number of visitors. */
  label: string;
  selected: boolean;
  hub: boolean;
  /** Changes each time a visitor arrives in this city; null when none just arrived. */
  arrivalKey: number | null;
  onShow: () => void;
  onHide: () => void;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="group absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none"
      style={{ left: `${location.x}%`, top: `${location.y}%` }}
      // hover only with a real mouse: on phones the tap opens the tooltip, and the map
      // sliding under the finger must not close it
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') onShow();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') onHide();
      }}
      onFocus={onShow}
      onBlur={onHide}
      onClick={onTap}
    >
      <span
        aria-hidden="true"
        className="bg-brand-teal/50 absolute h-3 w-3 rounded-full motion-safe:animate-ping"
        style={{ animationDelay: `${index * 0.27}s`, animationDuration: '2.4s' }}
      />
      <span
        aria-hidden="true"
        className={`relative rounded-full shadow-[0_0_0_3px_#FFFFFF,0_0_14px_rgba(73,184,173,0.7)] transition-colors ${hub ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-2.5 w-2.5 sm:h-3 sm:w-3'} ${selected || hub ? 'bg-brand-blue' : 'bg-brand-teal'} group-focus-visible:outline-brand-blue group-focus-visible:outline-2 group-focus-visible:outline-offset-4`}
      />
      {/* a visitor just arrived here: a ring bursts and "+1" floats up */}
      <AnimatePresence>
        {arrivalKey !== null && (
          <motion.span
            key={arrivalKey}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 motion-reduce:hidden"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          >
            <motion.span
              className="border-brand-teal absolute inset-0 rounded-full border-2"
              initial={{ scale: 0.4 }}
              animate={{ scale: 2.6 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
            <motion.span
              className="text-brand-teal absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-extrabold"
              initial={{ y: 0 }}
              animate={{ y: -18 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            >
              +1
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
