'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import {
  AnimatePresence,
  type MotionValue,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { Brain, Check, Heart, MapPin, Star, X } from 'lucide-react';
import Image from 'next/image';
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';

import { type BeltService, toProfiles, toServices } from './belt-data';
import { type BeltProfile, confidenceTier } from './belt-profile-card';

/** Time between two automatic swipes, in ms. */
const SWIPE_EVERY = 2800;
/** Pass, connect, pass, pass, connect… so the demo shows both buttons and a match. */
const DIRECTIONS = [-1, 1, -1, -1, 1] as const;
const TIER_COLORS = ['#61BCA6', '#2F76BB', '#F5A623'] as const;

/** Where the app's card and its two buttons sit inside hero-phone.png (323 × 639 px). */
const CARD_AREA: CSSProperties = {
  left: '12.07%',
  top: '12.52%',
  width: '75.54%',
  height: '62.44%',
};
const PASS_BUTTON: CSSProperties = {
  left: '12.38%',
  top: '84.35%',
  width: '31.58%',
  height: '5.95%',
};
const CONNECT_BUTTON: CSSProperties = {
  left: '47.99%',
  top: '84.35%',
  width: '39.32%',
  height: '5.95%',
};
/**
 * The screenshot's tab labels are in French: each one is covered by a translated label,
 * centred under its icon (x in %), on the label row. Fixed width, so a short word still hides a long one.
 */
const TAB_CENTERS = ['18.6%', '40.2%', '62.2%', '81.8%'] as const;
const TAB_ROW: CSSProperties = { top: '95.6%', height: '2.35%', width: '15%' };

type DemoCard = { service: BeltService; profile: BeltProfile };

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
        <div aria-hidden="true" className="@container pointer-events-none absolute inset-0">
          <span
            className="absolute flex items-center justify-center gap-[2cqw] rounded-[14px] border border-[#E2E8F0] bg-white text-[4.3cqw] font-bold whitespace-nowrap text-[#475569]"
            style={PASS_BUTTON}
          >
            <X className="h-[4.6cqw] w-[4.6cqw] text-[#64748B]" strokeWidth={2.5} />
            {t('landing.beltPass')}
          </span>
          <span
            className="absolute flex items-center justify-center gap-[2cqw] rounded-[14px] bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] text-[4.3cqw] font-bold whitespace-nowrap text-white"
            style={CONNECT_BUTTON}
          >
            <Check className="h-[4.6cqw] w-[4.6cqw]" strokeWidth={2.5} />
            {t('landing.beltLike')}
          </span>
          {tabs.map((label, index) => (
            <span
              key={label}
              className={`absolute flex -translate-x-1/2 items-center justify-center bg-white px-[1cqw] text-[2.9cqw] leading-none whitespace-nowrap ${index === 0 ? 'text-brand-blue font-bold' : 'text-[#64748B]'}`}
              style={{ ...TAB_ROW, left: TAB_CENTERS[index] }}
            >
              {label}
            </span>
          ))}
        </div>

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

function Bubble({
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

function MiniCard({
  card,
  labels,
}: {
  card: DemoCard;
  labels: { available: string; ai: string; confidence: string; distance: string; price: string };
}) {
  const { service, profile } = card;
  const tierColor = TIER_COLORS[confidenceTier(profile.score)];
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[6cqw] bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] shadow-lg">
      <Image
        src={service.image.src}
        alt=""
        width={service.image.width}
        height={service.image.height}
        sizes="240px"
        draggable={false}
        className="absolute bottom-0 left-1/2 h-[94%] w-auto max-w-none -translate-x-1/2"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 34%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      <div className="absolute top-[4cqw] flex flex-col items-start gap-[2cqw] ltr:left-[4cqw] rtl:right-[4cqw]">
        <span
          dir="ltr"
          className="flex items-center gap-[1cqw] rounded-full bg-white/95 px-[2.6cqw] py-[1cqw] text-[4.6cqw] font-bold text-[#353535]"
        >
          <Star className="h-[4.4cqw] w-[4.4cqw]" color="#F5A623" fill="#F5A623" />
          {profile.rating}
        </span>
        <span
          dir="ltr"
          className="flex items-center gap-[1.4cqw] rounded-full bg-black/55 px-[2.6cqw] py-[1cqw] text-[4.6cqw] font-extrabold text-white"
        >
          <Brain className="h-[4.4cqw] w-[4.4cqw] text-[#61BCA6]" />
          {profile.score}%<span className="text-[3.2cqw] opacity-85">{labels.ai}</span>
        </span>
        <span
          className="rounded-full border bg-black/35 px-[2.4cqw] py-[0.6cqw] text-[3.6cqw] font-bold"
          style={{ color: tierColor, borderColor: `${tierColor}99` }}
        >
          {labels.confidence}
        </span>
      </div>
      <span className="absolute top-[4cqw] flex items-center gap-[1cqw] rounded-full bg-[rgba(97,188,166,0.9)] px-[2.6cqw] py-[1.2cqw] text-[4.2cqw] font-bold text-white ltr:right-[4cqw] rtl:left-[4cqw]">
        <Check className="h-[4cqw] w-[4cqw]" strokeWidth={3} />
        {labels.available}
      </span>

      <div className="absolute inset-x-0 bottom-0 p-[5cqw] text-white">
        <div className="flex items-end justify-between gap-[3cqw]">
          <div className="min-w-0">
            <p className="truncate text-[8cqw] leading-tight font-bold">
              {profile.name}, {profile.age}
            </p>
            <p className="text-[5cqw] opacity-90">{service.title}</p>
          </div>
          <span
            dir="ltr"
            className="bg-brand-blue shrink-0 rounded-[3cqw] px-[3cqw] py-[1.6cqw] text-[4.8cqw] font-bold"
          >
            {labels.price}
          </span>
        </div>
        <p className="mt-[1.5cqw] flex items-center gap-[1cqw] text-[4.4cqw] opacity-85">
          <MapPin className="h-[4.4cqw] w-[4.4cqw]" color="#61BCA6" />
          {labels.distance}
        </p>
        <ul className="mt-[2.5cqw] flex flex-wrap gap-[1.6cqw]">
          {profile.tags.slice(0, 2).map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-[rgba(97,188,166,0.65)] px-[2.6cqw] py-[0.8cqw] text-[3.8cqw]"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
