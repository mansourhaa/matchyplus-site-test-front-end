'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Heart } from 'lucide-react';
import Image from 'next/image';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
} from 'react';

export type BeltMatchLabels = {
  title: string;
  body: string;
  cta: string;
  continue: string;
};

type MatchImage = { src: string; width: number; height: number };

/** Little hearts floating up behind the match celebration. */
const MATCH_HEARTS = [
  { left: '18%', delay: 0 },
  { left: '32%', delay: 0.5 },
  { left: '68%', delay: 0.25 },
  { left: '82%', delay: 0.75 },
];

const FOCUSABLE = 'a[href], button:not([disabled])';

/**
 * "C'est un match !" screen shown over the belt after a like.
 * - a click on the dimmed backdrop or Escape only closes it (`onDismiss`)
 * - "Continuer à découvrir" closes it and opens the next professional (`onContinue`)
 * - keyboard focus starts on the sign-up link and stays inside the box while it is open
 */
export function BeltMatchDialog({
  image,
  labels,
  registerHref,
  onDismiss,
  onContinue,
}: {
  image: MatchImage;
  labels: BeltMatchLabels;
  registerHref: string;
  onDismiss: () => void;
  onContinue: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    ctaRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Focus trap: Tab and Shift+Tab cycle between the box's links and buttons.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !boxRef.current) return;
    const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <motion.div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-testid="belt-match-backdrop"
      onClick={(event) => {
        // a click on the dimmed backdrop (outside the white box) just closes it
        if (event.target === event.currentTarget) onDismiss();
      }}
      onKeyDown={handleKeyDown}
      className="absolute inset-0 z-[500] flex items-center justify-center bg-[rgba(31,58,92,0.55)] p-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        ref={boxRef}
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
        initial={{ scale: 0.85, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      >
        {MATCH_HEARTS.map((heart) => (
          <motion.span
            key={heart.left}
            aria-hidden="true"
            className="absolute top-10 text-[#22C55E] motion-reduce:hidden"
            style={{ left: heart.left }}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: -90, opacity: [0, 1, 0], scale: 1 }}
            transition={{
              duration: 1.6,
              delay: heart.delay,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 0.6,
            }}
          >
            <Heart className="h-4 w-4" fill="currentColor" />
          </motion.span>
        ))}
        <div className="relative mx-auto mb-4 h-24 w-24">
          <div className="h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] ring-4 ring-[#22C55E]/30">
            <Image
              src={image.src}
              alt=""
              width={image.width}
              height={image.height}
              sizes="96px"
              className="h-[180%] w-full object-cover object-top"
            />
          </div>
          <span className="absolute -right-1 -bottom-1 grid h-9 w-9 place-items-center rounded-full bg-[#22C55E] text-white shadow-lg ring-4 ring-white">
            <Heart className="h-4 w-4" fill="currentColor" />
          </span>
        </div>
        <h3 id={titleId} className="text-brand-blue text-3xl font-extrabold">
          {labels.title}
        </h3>
        <p id={bodyId} className="text-muted-foreground mt-2 leading-relaxed">
          {labels.body}
        </p>
        {/* registerHref is the app (another site): a plain link, not Next's client-side <Link> */}
        <a
          ref={ctaRef}
          href={registerHref}
          className="focus-visible:ring-brand-teal mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] py-3 font-bold text-white shadow-md transition outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          {labels.cta}
          <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </a>
        <button
          type="button"
          onClick={onContinue}
          className="text-brand-navy focus-visible:ring-brand-teal mt-3 rounded text-sm font-semibold outline-none hover:underline focus-visible:ring-2"
        >
          {labels.continue}
        </button>
      </motion.div>
    </motion.div>
  );
}
