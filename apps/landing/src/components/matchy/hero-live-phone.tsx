'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { Brain, Check, Heart, MapPin } from 'lucide-react';
import Image from 'next/image';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { toProfiles, toServices } from './belt-data';
import { confidenceTier } from './belt-profile-card';
import { type DemoCard, MiniCard } from './hero-mini-card';
import { Bubble } from './hero-phone-bubble';
import { CONNECT_BUTTON, HeroPhoneOverlay, PASS_BUTTON } from './hero-phone-overlay';

/** Time between two automatic swipes, in ms. */
const SWIPE_EVERY = 2800;
/** Pass, connect, pass, pass, connect… so the demo shows both buttons and a match. */
const DIRECTIONS = [-1, 1, -1, -1, 1] as const;

/** Where the app's card sits inside hero-phone.png (323 × 639 px); buttons: hero-phone-overlay.tsx. */
const CARD_AREA: CSSProperties = {
  left: '12.07%',
  top: '12.52%',
  width: '75.54%',
  height: '62.44%',
};

/** Swipe direction of the swipe number `step` (1-based); 0 before the first swipe. */
export function swipeDirection(step: number): -1 | 0 | 1 {
  if (step <= 0) return 0;
  return DIRECTIONS[(step - 1) % DIRECTIONS.length];
}

/**
 * Hero phone: the app screenshot stays as the frame, and sample profile cards swipe by
 * themselves over its card area. Floating bubbles repeat what the current card shows, and the
 * scene follows the mouse a little. Everything stops for reduced motion and when off screen.
 */
export function HeroLivePhone({ alt }: { alt: string }) {
  const { t, tList, tRows } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;
  const services = toServices(tRows('landing.beltServices'));
  const profiles = toProfiles(tRows('landing.beltProfiles'));
  const confidenceLabels = tList('landing.beltConfidence');
  const tabs = tList('landing.heroPhoneTabs').slice(0, 4);
  const cards: DemoCard[] = services.flatMap((service) => {
    const profile = profiles[service.code];
    return profile ? [{ service, profile }] : [];
  });
  const count = cards.length;

  const sceneRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sceneRef, { amount: 0.3 });
  const [step, setStep] = useState(0);
  const running = !reduceMotion && inView && count > 1;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setStep((current) => current + 1);
    }, SWIPE_EVERY);
    return () => window.clearInterval(id);
  }, [running]);

  // Mouse parallax: -1..1 on each axis, smoothed by a spring.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 60, damping: 18 });
  const smoothY = useSpring(pointerY, { stiffness: 60, damping: 18 });
  const rotateY = useTransform(smoothX, [-1, 1], [-8, 8]);
  const rotateX = useTransform(smoothY, [-1, 1], [6, -6]);

  // logic, not markup: no pointer tilt for visitors who ask for reduced motion
  useEffect(() => {
    if (reduceMotion) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pointerX.set((event.clientX / window.innerWidth) * 2 - 1);
      pointerY.set((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduceMotion, pointerX, pointerY]);

  const direction = swipeDirection(step);
  const current = count > 0 ? cards[step % count] : undefined;
  const next = count > 0 ? cards[(step + 1) % count] : undefined;

  const renderCard = (card: DemoCard) => (
    <MiniCard
      card={card}
      labels={{
        available: t('landing.beltAvailable'),
        ai: t('landing.beltAi'),
        confidence: confidenceLabels[confidenceTier(card.profile.score)] ?? '',
        distance: t('landing.beltKm', { km: card.profile.distanceKm }),
        price: t('landing.beltPrice', { price: card.profile.price }),
      }}
    />
  );

  return (
    <div ref={sceneRef} className="relative mx-auto w-[clamp(230px,min(24vw,38svh),300px)]">
      <motion.div
        className="relative"
        // tilt values stay at 0 when the pointer listener is off (reduced motion)
        style={{ rotateX, rotateY, transformPerspective: 1000 }}
      >
        <Image
          src="/showcase/hero-phone.png"
          alt={alt}
          width={323}
          height={639}
          sizes="(max-width: 640px) 240px, 300px"
          priority
          className="h-auto w-full drop-shadow-2xl"
        />

        {/* the screenshot's buttons and tabs, redrawn so their labels follow the page language */}
        <HeroPhoneOverlay
          passLabel={t('landing.beltPass')}
          connectLabel={t('landing.beltLike')}
          tabs={tabs}
        />

        {current && next && (
          <div aria-hidden="true" className="@container absolute" style={CARD_AREA}>
            {/* the next card waits underneath, so the screenshot never shows through */}
            <div className="absolute inset-0 translate-y-[2%] scale-[0.94] opacity-90">
              {renderCard(next)}
            </div>
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                className="absolute inset-0"
                initial={{ scale: 0.94, y: '2%', opacity: 0.9 }}
                animate={{ scale: 1, y: '0%', opacity: 1, x: '0%', rotate: 0 }}
                exit="leave"
                variants={{
                  leave: (d: number) => ({
                    x: `${(d || -1) * 130}%`,
                    rotate: (d || -1) * 16,
                    opacity: 0,
                  }),
                }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              >
                {renderCard(current)}
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {direction === 1 && (
                <motion.span
                  key={`match-${step}`}
                  className="absolute top-[38%] left-1/2 z-10 flex -translate-x-1/2 items-center gap-[1.5cqw] rounded-full bg-white px-[4cqw] py-[2cqw] text-[5.5cqw] font-extrabold whitespace-nowrap text-[#22C55E] shadow-xl"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.08, 1, 1] }}
                  transition={{ duration: 1.8, times: [0, 0.2, 0.75, 1] }}
                >
                  <Heart className="h-[5.5cqw] w-[5.5cqw]" fill="currentColor" />
                  {t('landing.beltMatchTitle')}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* the app button that "was pressed" for the last swipe */}
        {direction !== 0 && (
          <motion.span
            key={`press-${step}`}
            aria-hidden="true"
            className={
              direction === 1
                ? 'absolute rounded-[14px] ring-4 ring-[#61BCA6]/70'
                : 'absolute rounded-[14px] ring-4 ring-slate-300/80'
            }
            style={direction === 1 ? CONNECT_BUTTON : PASS_BUTTON}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 1, 0], scale: [1, 0.96, 1.04] }}
            transition={{ duration: 0.7 }}
          />
        )}
      </motion.div>

      {current && (
        <>
          <Bubble
            className="-start-[12%] top-[1%] md:-start-[62%] md:top-[6%] rtl:md:-start-[16%]"
            depth={14}
            float={4.2}
            pointerX={smoothX}
            id={`a-${step}`}
            icon={<Check className="h-3.5 w-3.5" strokeWidth={3} />}
            iconClass="bg-[#22C55E]"
          >
            {t('landing.heroBubbleAvailable', { name: current.profile.name })}
          </Bubble>
          <Bubble
            className="-end-[12%] top-[42%] md:-end-[52%] md:top-[40%]"
            depth={-18}
            float={5}
            pointerX={smoothX}
            id={`b-${step}`}
            icon={<MapPin className="h-3.5 w-3.5" />}
            iconClass="bg-brand-blue"
          >
            {t('landing.heroBubbleDistance', { km: current.profile.distanceKm })}
          </Bubble>
          <Bubble
            className="-start-[12%] top-[79%] md:-start-[56%] md:top-[78%] rtl:md:-start-[16%]"
            depth={10}
            float={4.6}
            pointerX={smoothX}
            id={`c-${step}`}
            icon={<Brain className="h-3.5 w-3.5" />}
            iconClass="bg-[#61BCA6]"
          >
            {t('landing.heroBubbleScore', { score: current.profile.score })}
          </Bubble>
        </>
      )}
    </div>
  );
}
