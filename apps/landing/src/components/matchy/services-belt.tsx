'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { APP_REGISTER_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  AnimatePresence,
  type MotionValue,
  type PanInfo,
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from 'react';

import { type BeltRadii, angleToFront, beltPose, frontIndex } from './belt-geometry';
import { BeltMatchDialog } from './belt-match-dialog';
import { type BeltProfile, BeltProfileCard, confidenceTier } from './belt-profile-card';
import { Reveal } from './motion';

type ServiceImage = { src: string; width: number; height: number };

type BeltService = {
  code: string;
  title: string;
  description: string;
  items: string[];
  image: ServiceImage;
};

type StageSize = { width: number; height: number };

/** Cut-out illustration for each service code declared in `landing.beltServices`. */
const SERVICE_IMAGES: Record<string, ServiceImage> = {
  PLB: { src: '/matchy/belt/plumber.webp', width: 439, height: 934 },
  ELC: { src: '/matchy/belt/electrician.webp', width: 513, height: 1100 },
  CHF: { src: '/matchy/belt/driver.webp', width: 483, height: 1097 },
  GDE: { src: '/matchy/belt/nanny.webp', width: 471, height: 946 },
  MEN: { src: '/matchy/belt/cleaner.webp', width: 435, height: 905 },
};

/** Auto-rotation speed, in radians per millisecond (≈ one turn every 35 s). */
const AUTO_SPEED = 0.00018;
/** Drag sensitivity, in radians per pixel. */
const DRAG_SPEED = 0.006;
/** Breakpoint (px) above which the card sits beside the professional instead of below. */
const WIDE_STAGE = 768;

const FOCUS_SPRING = { type: 'spring', stiffness: 120, damping: 22 } as const;

function toProfiles(rows: unknown): Record<string, BeltProfile> {
  if (!Array.isArray(rows)) return {};
  const profiles: Record<string, BeltProfile> = {};
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const [code, name, age, distanceKm, rating, reviews, score, price, bio, ...tags] =
      row as string[];
    profiles[code] = {
      name,
      age,
      distanceKm,
      rating,
      reviews,
      score: Number(score),
      price,
      bio,
      tags,
    };
  }
  return profiles;
}

function toServices(rows: unknown): BeltService[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!Array.isArray(row)) return [];
    const [code, title, description, ...items] = row as string[];
    const image = SERVICE_IMAGES[code];
    return image ? [{ code, title, description, items, image }] : [];
  });
}

function stageGeometry({ width, height }: StageSize) {
  const rx = Math.min(width * 0.36, 440);
  const radii: BeltRadii = { rx, ry: rx * 0.3 };
  return {
    radii,
    centerX: width / 2,
    // On narrow screens the belt sits lower, closer to the title strip.
    centerY: height * (width < WIDE_STAGE ? 0.6 : 0.54),
    // Full-body portraits: the front professional takes about half the stage height.
    baseHeight: Math.min(Math.max(height * 0.52, 230), 380),
  };
}

function BeltPerson({
  service,
  index,
  count,
  angle,
  motionBlur,
  size,
  selected,
  hidden,
  wide,
  isRtl,
  entered,
  label,
  hint,
  onOpen,
  buttonRef,
}: {
  service: BeltService;
  index: number;
  count: number;
  angle: MotionValue<number>;
  motionBlur: MotionValue<number>;
  size: StageSize;
  selected: boolean;
  hidden: boolean;
  wide: boolean;
  isRtl: boolean;
  entered: boolean;
  label: string;
  hint: string;
  onOpen: (index: number) => void;
  buttonRef: (node: HTMLButtonElement | null) => void;
}) {
  const { radii, centerX, centerY, baseHeight } = stageGeometry(size);
  const pose = (a: number) => beltPose(a, index, count, radii);

  const x = useTransform(angle, (a) => pose(a).x);
  const y = useTransform(angle, (a) => pose(a).y);
  const scale = useTransform(angle, (a) => pose(a).scale);
  const opacity = useTransform(angle, (a) => pose(a).opacity);
  const zIndex = useTransform(angle, (a) => pose(a).zIndex);
  const filter = useTransform([angle, motionBlur], ([a, blur]: number[]) => {
    const p = pose(a);
    return `blur(${(p.blur + blur * (0.4 + p.depth)).toFixed(2)}px)`;
  });

  const width = baseHeight * (service.image.width / service.image.height);
  const focusShift = wide ? size.width * (isRtl ? 0.2 : -0.2) : 0;

  return (
    // Full-stage layer: scaling it around the front spot enlarges the selected professional in place.
    <motion.div
      className="pointer-events-none absolute inset-0"
      style={{
        zIndex: selected ? 300 : zIndex,
        transformOrigin: `${centerX}px ${centerY + radii.ry}px`,
      }}
      initial={{ opacity: 0, y: 60 }}
      animate={
        !entered
          ? { opacity: 0, y: 60 }
          : selected
            ? { scale: wide ? 1.25 : 1.12, x: focusShift, y: 0, opacity: 1, filter: 'blur(0px)' }
            : hidden
              ? { scale: 0.92, x: 0, y: 0, opacity: 0, filter: 'blur(12px)' }
              : { scale: 1, x: 0, y: 0, opacity: 1, filter: 'blur(0px)' }
      }
      // People step onto the belt one after another, and come back the same way.
      transition={selected ? FOCUS_SPRING : { ...FOCUS_SPRING, delay: index * 0.09 }}
    >
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => onOpen(index)}
        disabled={hidden}
        aria-label={label}
        className={cn(
          'group absolute origin-bottom cursor-pointer outline-none',
          'focus-visible:ring-brand-teal focus-visible:ring-4 focus-visible:ring-offset-4',
          hidden ? 'pointer-events-none' : 'pointer-events-auto',
        )}
        style={{
          left: centerX - width / 2,
          top: centerY - baseHeight,
          width,
          height: baseHeight,
          x,
          y,
          scale,
          opacity,
          filter: selected ? 'none' : filter,
        }}
      >
        <span
          aria-hidden="true"
          className="absolute -bottom-3 left-1/2 h-6 w-[80%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgba(47,118,187,0.35),transparent_70%)]"
        />
        <span className="relative block h-full w-full transition-[transform,filter] duration-300 ease-out group-hover:-translate-y-2 group-hover:drop-shadow-[0_18px_24px_rgba(45,121,190,0.3)] group-focus-visible:-translate-y-2">
          <Image
            src={service.image.src}
            alt=""
            width={service.image.width}
            height={service.image.height}
            sizes="(max-width: 768px) 220px, 440px"
            draggable={false}
            className="h-full w-full object-contain object-bottom select-none"
          />
        </span>
        {!selected && (
          <span
            aria-hidden="true"
            className="bg-brand-navy absolute -top-2 left-1/2 -translate-x-1/2 translate-y-1 rounded px-2.5 py-1 font-mono text-[11px] tracking-wider whitespace-nowrap text-white uppercase opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
          >
            {hint}
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}

export function ServicesBelt() {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();

  const services = toServices(t('landing.beltServices'));
  const profiles = toProfiles(t('landing.beltProfiles'));
  const confidenceLabels = (t('landing.beltConfidence') as unknown as string[]) ?? [];
  const count = services.length;

  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { amount: 0.2 });
  const entered = useInView(stageRef, { amount: 0.3, once: true });
  const [size, setSize] = useState<StageSize>({ width: 0, height: 0 });
  const [front, setFront] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const angle = useMotionValue(0);
  const velocity = useVelocity(angle);
  const motionBlur = useTransform(velocity, (v) =>
    reduceMotion ? 0 : Math.min(5, Math.abs(v) * 1.2),
  );

  // Scene tilt following the pointer, for a sense of depth.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const sceneRotateY = useSpring(pointerX, { stiffness: 70, damping: 20 });
  const sceneRotateX = useSpring(pointerY, { stiffness: 70, damping: 20 });

  const dragging = useRef(false);
  const spinning = useRef(false);
  const justDragged = useRef(false);
  const frontRef = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const personRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastOpened = useRef<number | null>(null);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useMotionValueEvent(angle, 'change', (a) => {
    const next = frontIndex(a, count);
    if (next !== frontRef.current) {
      frontRef.current = next;
      setFront(next);
    }
  });

  useAnimationFrame((_, delta) => {
    if (reduceMotion || !inView || paused || selected !== null || matched !== null) return;
    if (dragging.current || spinning.current) return;
    angle.set(angle.get() + delta * AUTO_SPEED);
  });

  const rotateTo = (index: number) => {
    const target = angleToFront(angle.get(), index, count);
    if (reduceMotion) angle.set(target);
    else animate(angle, target, FOCUS_SPRING);
  };

  const open = (index: number) => {
    if (justDragged.current) return;
    lastOpened.current = index;
    rotateTo(index);
    setSelected(index);
  };

  const close = () => {
    setSelected(null);
    const trigger = lastOpened.current;
    if (trigger !== null) personRefs.current[trigger]?.focus({ preventScroll: true });
  };

  // Pass: the card flies away and the next professional comes to the front.
  const passCurrent = () => {
    if (selected === null) return;
    open((selected + 1) % count);
  };

  // Like: celebrate the match and invite the visitor to sign up.
  const likeCurrent = () => {
    if (selected === null) return;
    setMatched(selected);
    setSelected(null);
  };

  const keepExploring = () => {
    const last = matched;
    setMatched(null);
    if (last !== null) open((last + 1) % count);
  };

  // Backdrop click or Escape: close the match screen and give focus back to that professional.
  const dismissMatch = () => {
    const last = matched;
    setMatched(null);
    if (last !== null) personRefs.current[last]?.focus({ preventScroll: true });
  };

  const onEscape = useEffectEvent(() => close());

  useEffect(() => {
    if (selected === null) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const handlePan = (_: PointerEvent, info: PanInfo) => {
    angle.set(angle.get() + info.delta.x * DRAG_SPEED);
  };

  // A flick keeps the belt turning, then it slows down on its own.
  const handlePanEnd = (_: PointerEvent, info: PanInfo) => {
    dragging.current = false;
    window.setTimeout(() => {
      justDragged.current = false;
    }, 0);
    const spin = info.velocity.x * DRAG_SPEED;
    if (reduceMotion || selected !== null || Math.abs(spin) < 0.3) return;
    spinning.current = true;
    animate(angle, angle.get(), {
      type: 'inertia',
      velocity: spin,
      power: 0.5,
      timeConstant: 650,
      onComplete: () => {
        spinning.current = false;
      },
    });
  };

  const handleScenePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduceMotion || selected !== null || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - rect.left) / rect.width - 0.5) * 6);
    pointerY.set(((event.clientY - rect.top) / rect.height - 0.5) * -4);
  };

  if (count === 0) return null;

  const wide = size.width >= WIDE_STAGE;
  const focused = selected !== null ? services[selected] : null;
  const current = services[front];
  const matchedService = matched !== null ? services[matched] : null;
  const matchedProfile = matchedService ? profiles[matchedService.code] : undefined;

  const renderCard = (service: BeltService, className: string) => {
    const profile = profiles[service.code];
    if (!profile) return null;
    return (
      <BeltProfileCard
        key={service.code}
        className={className}
        image={service.image}
        profile={profile}
        labels={{
          role: service.title,
          available: t('landing.beltAvailable'),
          seeDetails: t('landing.beltSeeDetails'),
          ai: t('landing.beltAi'),
          confidence: confidenceLabels[confidenceTier(profile.score)] ?? '',
          distance: t('landing.beltKm', { km: profile.distanceKm }),
          price: t('landing.beltPrice', { price: profile.price }),
          pass: t('landing.beltPass'),
          like: t('landing.beltLike'),
          close: t('landing.beltClose'),
          sample: t('landing.beltSample'),
        }}
        detailsHref={APP_REGISTER_URL}
        titleId={titleId}
        reduceMotion={reduceMotion}
        onPass={passCurrent}
        onLike={likeCurrent}
        onClose={close}
        closeRef={closeRef}
      />
    );
  };

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-5 py-20" id="services-belt">
      <Reveal className="mx-auto max-w-2xl text-center">
        <div className="bg-brand-teal mx-auto mb-4 h-1 w-10 rounded" />
        <p className="text-brand-teal mb-2 text-sm font-semibold tracking-wide">
          {t('landing.beltEyebrow')}
        </p>
        <h2 className="text-brand-blue text-3xl font-bold text-balance md:text-4xl">
          {t('landing.beltTitle')}
        </h2>
        <p className="text-muted-foreground mt-4 leading-relaxed text-pretty">
          {t('landing.beltBody')}
        </p>
      </Reveal>

      <motion.div
        ref={stageRef}
        onPanStart={() => {
          angle.stop();
          spinning.current = false;
          dragging.current = true;
          justDragged.current = true;
        }}
        onPan={selected === null ? handlePan : undefined}
        onPanEnd={handlePanEnd}
        onPointerEnter={() => setPaused(true)}
        onPointerMove={handleScenePointer}
        onPointerLeave={() => {
          setPaused(false);
          pointerX.set(0);
          pointerY.set(0);
        }}
        className="relative mt-12 h-[520px] touch-pan-y overflow-hidden rounded-[2.5rem] bg-[linear-gradient(160deg,#cfe2f6_0%,#bcdcef_45%,#a8dccd_100%)] select-none sm:h-[600px] md:h-[680px]"
      >
        {size.width > 0 && (
          <motion.div
            className="absolute inset-0"
            style={{
              rotateX: selected === null ? sceneRotateX : 0,
              rotateY: selected === null ? sceneRotateY : 0,
              transformPerspective: 1400,
            }}
          >
            {/* brand glow behind the belt */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0)_55%)]"
            />
            {/* colored floor under the belt */}
            {(() => {
              const { radii, centerX, centerY } = stageGeometry(size);
              const w = (radii.rx + 70) * 2;
              const h = (radii.ry + 26) * 2;
              return (
                <div
                  aria-hidden="true"
                  className="absolute rounded-[50%] bg-[radial-gradient(ellipse,rgba(255,255,255,0.85)_0%,rgba(97,188,166,0.35)_55%,rgba(47,118,187,0.28)_100%)] shadow-[0_30px_80px_-20px_rgba(47,118,187,0.45)]"
                  style={{ left: centerX - w / 2, top: centerY - h / 2, width: w, height: h }}
                />
              );
            })()}
            {/* matte floor: fine concentric rings around the belt */}
            {(() => {
              const { radii, centerX, centerY } = stageGeometry(size);
              return [1, 1.35, 1.75].map((ring) => (
                <div
                  key={ring}
                  aria-hidden="true"
                  className="absolute rounded-[50%] border border-white/60"
                  style={{
                    left: centerX - (radii.rx + 40) * ring,
                    top: centerY - (radii.ry + 14) * ring,
                    width: (radii.rx + 40) * ring * 2,
                    height: (radii.ry + 14) * ring * 2,
                  }}
                />
              ));
            })()}

            {services.map((service, i) => (
              <BeltPerson
                key={service.code}
                service={service}
                index={i}
                count={count}
                angle={angle}
                motionBlur={motionBlur}
                size={size}
                selected={selected === i}
                hidden={selected !== null && selected !== i}
                wide={wide}
                isRtl={isRtl}
                entered={entered}
                label={t('landing.beltSelect', { service: service.title })}
                hint={t('landing.beltOpenCard')}
                onOpen={open}
                buttonRef={(node) => {
                  personRefs.current[i] = node;
                }}
              />
            ))}
          </motion.div>
        )}

        {/* index of services */}
        <nav
          aria-label={t('landing.beltServicesLabel')}
          className="absolute top-5 z-[400] flex gap-1.5 font-mono md:flex-col ltr:left-5 rtl:right-5"
        >
          {services.map((service, i) => {
            const active = (selected ?? front) === i;
            return (
              <button
                key={service.code}
                type="button"
                aria-label={t('landing.beltSelect', { service: service.title })}
                aria-current={active ? 'true' : undefined}
                onClick={() => {
                  setSelected(null);
                  rotateTo(i);
                }}
                className={cn(
                  'focus-visible:ring-brand-teal h-7 w-10 rounded border text-xs font-semibold transition-colors outline-none focus-visible:ring-2',
                  active
                    ? 'border-brand-blue bg-brand-blue text-white'
                    : 'text-brand-navy border-black/10 bg-white/80 hover:bg-white',
                )}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            );
          })}
        </nav>

        {/* belt mode: current service + its services */}
        <AnimatePresence>
          {focused === null && current && (
            <motion.div
              key="belt-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-5 bottom-5 z-[400] flex items-end justify-between gap-6"
            >
              <div className="min-w-0">
                <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-wider uppercase">
                  <span className="bg-brand-teal h-2 w-2 animate-pulse rounded-full" />
                  {t('landing.beltRunning')}
                  <span dir="ltr" className="bg-brand-navy rounded px-1.5 text-white">
                    {String(front + 1).padStart(2, '0')}
                  </span>
                  <span dir="ltr">/ {String(count).padStart(2, '0')}</span>
                </p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={current.code}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="text-brand-blue truncate text-4xl leading-none font-extrabold md:text-6xl"
                  >
                    {current.title}
                  </motion.p>
                </AnimatePresence>
              </div>

              <div className="pointer-events-auto hidden w-72 shrink-0 rounded-2xl border border-black/5 bg-white/90 p-4 shadow-xl shadow-black/5 backdrop-blur md:block">
                <p className="text-muted-foreground flex justify-between border-b border-black/5 pb-2 font-mono text-[10px] tracking-wider uppercase">
                  <span>{t('landing.beltInService')}</span>
                  <span dir="ltr">{current.code}</span>
                </p>
                <ul className="divide-y divide-black/5">
                  {current.items.map((item) => (
                    <li key={item} className="text-brand-navy py-2 text-sm font-semibold">
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => open(front)}
                  className="bg-brand-blue hover:bg-brand-navy focus-visible:ring-brand-teal mt-2 flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  {t('landing.beltOpenCard')}
                  <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* focus mode: scan line over the professional */}
        {focused !== null && !reduceMotion && (
          <motion.div
            aria-hidden="true"
            className="bg-brand-teal pointer-events-none absolute z-[350] h-0.5 w-56 -translate-x-1/2 shadow-[0_0_14px_#49b8ad]"
            style={{ left: size.width / 2 + (wide ? size.width * (isRtl ? 0.2 : -0.2) : 0) }}
            initial={{ top: '12%', opacity: 0 }}
            animate={{ top: ['12%', '86%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          />
        )}

        {/* focus mode: the profile card, beside the professional on wide screens */}
        {wide && (
          <div className="absolute top-6 z-[400] w-[340px] ltr:right-8 rtl:left-8">
            <AnimatePresence mode="wait">
              {focused && renderCard(focused, 'h-[620px]')}
            </AnimatePresence>
          </div>
        )}

        {/* like: match celebration */}
        <AnimatePresence>
          {matchedService && matchedProfile && (
            <BeltMatchDialog
              key="match"
              image={matchedService.image}
              labels={{
                title: t('landing.beltMatchTitle'),
                body: t('landing.beltMatchBody', { name: matchedProfile.name }),
                cta: t('landing.beltMatchCta'),
                continue: t('landing.beltMatchContinue'),
              }}
              registerHref={APP_REGISTER_URL}
              reduceMotion={reduceMotion}
              onDismiss={dismissMatch}
              onContinue={keepExploring}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* focus mode on small screens: the card drops below the stage */}
      {!wide && (
        <div className="mx-auto mt-8 max-w-sm">
          <AnimatePresence mode="wait">
            {focused && renderCard(focused, 'h-[610px]')}
          </AnimatePresence>
          {!focused && current && (
            <button
              type="button"
              onClick={() => open(front)}
              className="bg-brand-blue focus-visible:ring-brand-teal flex w-full items-center justify-between rounded-xl px-5 py-3 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {t('landing.beltOpenCard')} · {current.title}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
