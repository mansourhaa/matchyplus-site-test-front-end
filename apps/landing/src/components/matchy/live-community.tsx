'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { AnimatePresence, MotionConfig, motion, useInView } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import {
  type CityId,
  HUB_ID,
  MAP_HEIGHT,
  MAP_WIDTH,
  SAMPLE_AUDIENCE,
  SAMPLE_LOCATIONS,
  arcPath,
  nudge,
  numberLocale,
  toCityNames,
  tooltipPlacement,
  totalVisitors,
} from './community-map';
import { Reveal } from './motion';

/** Time between two sample updates, in ms. */
const UPDATE_EVERY = 1800;

/** Where the phone view of the map starts: Tunis, in % of the map width. */
const MOBILE_FOCUS_X = 52.7;

/** Lines from Tunis: each takes ARC_DRAW s to draw, one starts every ARC_STAGGER s. */
const ARC_DRAW = 1.6;
const ARC_FADE = 0.8;
const ARC_STAGGER = 0.7;

/**
 * Where the counters float on the map on computers, in % (left / top), over open ocean: no land
 * or city under them. Same order as the counters: international presence (the headline number)
 * over the South Pacific, audience over the Indian Ocean.
 */
const STAT_SPOTS = [
  { left: 5, top: 62, centered: false },
  { left: 64, top: 61, centered: false },
] as const;

const TOOLTIP_ALIGN = {
  start: '-translate-x-4',
  center: '-translate-x-1/2',
  end: '-translate-x-[calc(100%-1rem)]',
} as const;

/** Last sample update, to show a "+1" on the city a visitor just arrived in. */
type Arrival = { id: CityId; key: number };

/**
 * "The Matchy+ community in real time": a world map with the cities visiting right now,
 * live counters on the map, lines from Tunis and a tooltip per city. Sample figures,
 * labelled on screen; see community-map.ts to plug real, aggregated data.
 * Animations are hidden with CSS for "reduce motion", never with JS, so the server and the
 * browser always render the same HTML.
 */
export function LiveCommunity() {
  const { t, locale } = useI18n();
  const cities = toCityNames(t('landing.communityCities'));
  const format = new Intl.NumberFormat(numberLocale(locale));

  const [locations, setLocations] = useState(SAMPLE_LOCATIONS);
  const [audience, setAudience] = useState(SAMPLE_AUDIENCE);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [selectedId, setSelectedId] = useState<CityId | null>(null);

  // Sample activity, only while the section is on screen and the tab is visible.
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.2 });
  useEffect(() => {
    if (!inView) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const index = Math.floor(Math.random() * SAMPLE_LOCATIONS.length);
      const delta = Math.random() > 0.47 ? 1 : -1;
      setLocations((current) => nudge(current, index, delta));
      if (delta > 0) setArrival({ id: SAMPLE_LOCATIONS[index].id, key: Date.now() });
      if (Math.random() > 0.35) setAudience((current) => current + 1);
    }, UPDATE_EVERY);
    return () => window.clearInterval(id);
  }, [inView]);

  // On phones the map is wider than the screen and scrolls sideways: it starts on Tunis,
  // and a tapped city slides to the middle so its tooltip is fully visible.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const centerOn = (x: number, behavior: ScrollBehavior) => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollTo({
      left: (scroller.scrollWidth * x) / 100 - scroller.clientWidth / 2,
      behavior,
    });
  };
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollLeft = (scroller.scrollWidth * MOBILE_FOCUS_X) / 100 - scroller.clientWidth / 2;
  }, []);

  const hub = SAMPLE_LOCATIONS.find((location) => location.id === HUB_ID);
  const routes = SAMPLE_LOCATIONS.filter((location) => location.id !== HUB_ID);
  // every line waits for the others before drawing again
  const arcPause = (routes.length - 1) * ARC_STAGGER + 1;

  const selected = locations.find((location) => location.id === selectedId);
  const placement = selected ? tooltipPlacement(selected.x, selected.y) : null;
  const metrics = [
    { label: t('landing.communityPresence'), value: totalVisitors(locations), headline: true },
    { label: t('landing.communityAudience'), value: audience, headline: false },
  ];

  return (
    <section ref={sectionRef} className="relative z-10 bg-[#F7FAFD] py-20 md:py-24">
      {/* floating and sliding stop for visitors who ask for reduced motion */}
      <MotionConfig reducedMotion="user">
        <div className="mx-auto max-w-6xl px-5">
          {/* same heading as the other sections */}
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="bg-brand-teal mx-auto mb-4 h-1 w-10 rounded" />
            <p className="text-brand-teal mb-2 flex items-center justify-center gap-2 text-sm font-semibold tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="bg-brand-teal absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping" />
                <span className="bg-brand-teal relative inline-flex h-2 w-2 rounded-full" />
              </span>
              {t('landing.communityBadge')}
            </p>
            <h2 className="text-brand-blue text-3xl font-bold text-balance md:text-4xl">
              {t('landing.communityTitle')}
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed text-pretty">
              {t('landing.communityBody')}
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            {/* no frame: the map blends into the page, its edges fade out */}
            <figure className="relative mt-10">
              {/* map positions are left-to-right whatever the page direction; on phones the
                  map keeps a readable size and scrolls sideways */}
              <div
                ref={scrollerRef}
                dir="ltr"
                className="[scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
              >
                <div
                  className="relative w-full min-w-[40rem] md:min-w-0"
                  style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
                >
                  <Image
                    src="/matchy/community/world-map.svg"
                    alt={t('landing.communityMapLabel')}
                    width={MAP_WIDTH}
                    height={MAP_HEIGHT}
                    unoptimized
                    className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_75%_75%_at_50%_50%,black_70%,transparent_100%)] select-none"
                    draggable={false}
                  />
                  {/* light sweep, with the same faded edges as the map so it never shows as a box */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_75%_75%_at_50%_50%,black_70%,transparent_100%)] motion-reduce:hidden"
                  >
                    <motion.div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(73,184,173,0.10)_43%,transparent_63%)] motion-reduce:hidden"
                      initial={{ x: '-120%' }}
                      animate={{ x: '120%' }}
                      transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                    />
                  </div>

                  {/* lines from Tunis, where Matchy+ was born, drawn one after another */}
                  {hub && (
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
                  )}

                  {locations.map((location, index) => {
                    const city = cities[location.id] ?? location.id;
                    const isSelected = location.id === selectedId;
                    const isHub = location.id === HUB_ID;
                    return (
                      <button
                        key={location.id}
                        type="button"
                        aria-label={`${city} : ${t('landing.communityVisitors', { count: format.format(location.count) })}`}
                        className="group absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none"
                        style={{ left: `${location.x}%`, top: `${location.y}%` }}
                        // hover only with a real mouse: on phones the tap opens the tooltip, and the map
                        // sliding under the finger must not close it
                        onPointerEnter={(event) => {
                          if (event.pointerType === 'mouse') setSelectedId(location.id);
                        }}
                        onPointerLeave={(event) => {
                          if (event.pointerType === 'mouse') setSelectedId(null);
                        }}
                        onFocus={() => setSelectedId(location.id)}
                        onBlur={() => setSelectedId(null)}
                        onClick={() => {
                          setSelectedId(location.id);
                          centerOn(location.x, 'smooth');
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="bg-brand-teal/50 absolute h-3 w-3 rounded-full motion-safe:animate-ping"
                          style={{ animationDelay: `${index * 0.27}s`, animationDuration: '2.4s' }}
                        />
                        <span
                          aria-hidden="true"
                          className={`relative rounded-full shadow-[0_0_0_3px_#FFFFFF,0_0_14px_rgba(73,184,173,0.7)] transition-colors ${isHub ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-2.5 w-2.5 sm:h-3 sm:w-3'} ${isSelected || isHub ? 'bg-brand-blue' : 'bg-brand-teal'} group-focus-visible:outline-brand-blue group-focus-visible:outline-2 group-focus-visible:outline-offset-4`}
                        />
                        {/* a visitor just arrived here: a ring bursts and "+1" floats up */}
                        <AnimatePresence>
                          {arrival?.id === location.id && (
                            <motion.span
                              key={arrival.key}
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
                  })}

                  {/* counters, floating over the map (computers only) */}
                  {metrics.map((metric, index) => (
                    <motion.div
                      key={metric.label}
                      // Tailwind's translate and framer's transform are separate CSS properties
                      className={`pointer-events-none absolute z-10 hidden md:block ${STAT_SPOTS[index].centered ? '-translate-x-1/2 text-center' : ''}`}
                      style={{
                        left: `${STAT_SPOTS[index].left}%`,
                        top: `${STAT_SPOTS[index].top}%`,
                      }}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.6, delay: 0.3 + index * 0.2, ease: 'easeOut' }}
                    >
                      <motion.dl
                        // the map is left-to-right; the counter's text follows the page language
                        dir={locale === 'ar' ? 'rtl' : 'ltr'}
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          duration: 5,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'easeInOut',
                          delay: index * 0.8,
                        }}
                      >
                        <Stat {...metric} format={format} centered={STAT_SPOTS[index].centered} />
                      </motion.dl>
                    </motion.div>
                  ))}

                  <div role="status" aria-live="polite">
                    {selected && placement && (
                      <div
                        className={`bg-brand-navy pointer-events-none absolute z-20 min-w-40 rounded-xl px-3 py-2 text-white shadow-xl ${TOOLTIP_ALIGN[placement.align]} ${placement.below ? 'translate-y-4' : '-translate-y-[calc(100%+1rem)]'}`}
                        style={{ left: `${selected.x}%`, top: `${selected.y}%` }}
                      >
                        <p dir={locale === 'ar' ? 'rtl' : 'ltr'} className="text-sm font-bold">
                          {cities[selected.id]}
                        </p>
                        <p dir={locale === 'ar' ? 'rtl' : 'ltr'} className="text-xs text-white/70">
                          {t('landing.communityVisitors', {
                            count: format.format(selected.count),
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </figure>

            {/* phones: the counters sit in a row under the map */}
            <div className="mt-6 grid grid-cols-2 divide-x divide-slate-200 text-center md:hidden rtl:divide-x-reverse">
              {metrics.map((metric) => (
                <dl key={metric.label} className="px-2">
                  <Stat {...metric} format={format} centered />
                </dl>
              ))}
            </div>

            <footer className="text-muted-foreground mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-xs sm:text-sm">
              <span className="flex items-center gap-2">
                <span className="bg-brand-teal h-2 w-2 rounded-full shadow-[0_0_0_2px_#FFFFFF,0_0_8px_rgba(73,184,173,0.7)]" />
                {t('landing.communityLegendApprox')}
              </span>
              <span>{t('landing.communityLegendHint')}</span>
              <span className="md:hidden">{t('landing.communityLegendSwipe')}</span>
              <span className="text-brand-teal font-semibold">
                ● {t('landing.communityLegendLive')}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600">
                {t('landing.communitySample')}
              </span>
            </footer>
          </Reveal>
        </div>
      </MotionConfig>
    </section>
  );
}

/**
 * One counter: label, then the number, which slides in when it changes. The headline one
 * (international presence) is bigger and teal, with a pulsing dot.
 */
function Stat({
  label,
  value,
  headline,
  format,
  centered = false,
}: {
  label: string;
  value: number;
  headline: boolean;
  format: Intl.NumberFormat;
  centered?: boolean;
}) {
  return (
    <>
      <dt
        className={`flex items-center gap-1.5 text-[10px] leading-tight font-bold text-slate-500 uppercase sm:text-xs sm:tracking-wide ${centered ? 'justify-center' : ''}`}
      >
        {headline && (
          <span className="bg-brand-teal h-1.5 w-1.5 shrink-0 rounded-full motion-safe:animate-pulse" />
        )}
        {label}
      </dt>
      {/* not animated on the first render, so the HTML matches the server's */}
      <dd
        className={`relative mt-1 overflow-hidden font-extrabold tabular-nums [text-shadow:0_0_16px_#F7FAFD] ${headline ? 'text-brand-teal text-3xl md:text-6xl' : 'text-brand-blue text-2xl md:text-4xl'}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            className="block"
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {format.format(value)}
          </motion.span>
        </AnimatePresence>
      </dd>
    </>
  );
}
