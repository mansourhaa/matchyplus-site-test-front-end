'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { APP_REGISTER_URL } from '@/lib/constants';
import {
  AnimatePresence,
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
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from 'react';

import { type BeltService, personTag, toProfiles, toServices } from './belt-data';
import { BeltFloor } from './belt-floor';
import { type StageSize, WIDE_STAGE, angleToFront, frontIndex } from './belt-geometry';
import { BeltMatchDialog } from './belt-match-dialog';
import { BeltPerson, FOCUS_SPRING } from './belt-person';
import { BeltProfileCard, confidenceTier } from './belt-profile-card';
import { BeltServiceInfo } from './belt-service-info';
import { Reveal } from './motion';

/** Auto-rotation speed, in radians per millisecond (≈ one turn every 35 s). */
const AUTO_SPEED = 0.00018;
/** Drag sensitivity, in radians per pixel. */
const DRAG_SPEED = 0.006;

export function ServicesBelt() {
  const { t, dir, tList, tRows } = useI18n();
  const isRtl = dir === 'rtl';
  const reduceMotion = useReducedMotion() ?? false;
  const titleId = useId();

  const services = toServices(tRows('landing.beltServices'));
  const profiles = toProfiles(tRows('landing.beltProfiles'));
  const confidenceLabels = tList('landing.beltConfidence');
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
        className="relative mt-12 h-[520px] touch-pan-y overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-[#2F76BB]/10 select-none sm:h-[600px] md:h-[680px]"
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
            <BeltFloor size={size} />

            {services.map((service, i) => {
              const profile = profiles[service.code];
              const tag = personTag(
                profile,
                t('landing.beltPrice', { price: profile?.price ?? '' }),
                service.title,
              );
              return (
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
                  label={`${t('landing.beltSelect', { service: service.title })}, ${tag}`}
                  tag={tag}
                  onOpen={open}
                  buttonRef={(node) => {
                    personRefs.current[i] = node;
                  }}
                />
              );
            })}
          </motion.div>
        )}

        {/* belt mode: current service + its services */}
        <AnimatePresence>
          {focused === null && current && (
            <BeltServiceInfo
              key="belt-info"
              service={current}
              position={front}
              count={count}
              onOpen={() => open(front)}
            />
          )}
        </AnimatePresence>

        {/* focus mode: scan line over the professional (it moves `top`, so CSS hides it) */}
        {focused !== null && (
          <motion.div
            aria-hidden="true"
            className="bg-brand-teal pointer-events-none absolute z-[350] h-0.5 w-56 -translate-x-1/2 shadow-[0_0_14px_#49b8ad] motion-reduce:hidden"
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
