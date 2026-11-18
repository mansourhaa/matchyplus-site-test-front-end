'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import {
  type CityId,
  HUB_ID,
  MAP_HEIGHT,
  MAP_WIDTH,
  SAMPLE_LOCATIONS,
  SAMPLE_TODAY,
  arcPath,
  countCountries,
  nudge,
  numberLocale,
  toCityNames,
  tooltipPlacement,
  totalActive,
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
  const [today, setToday] = useState(SAMPLE_TODAY);
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
      if (Math.random() > 0.35) setToday((current) => current + 1);
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
    { label: t('landing.communityActive'), value: totalActive(locations), live: true },
    { label: t('landing.communityToday'), value: today, live: false },
    { label: t('landing.communityCountries'), value: countCountries(locations), live: false },
  ];

  return (
    <section ref={sectionRef} className="relative z-10 bg-[#F7FAFD] py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 shadow-2xl shadow-[#2F76BB]/10 md:p-8">
            <div
              aria-hidden="true"
              className="bg-brand-teal/10 absolute -top-32 h-72 w-72 rounded-full blur-3xl ltr:-left-20 rtl:-right-20"
            />

            <header className="relative max-w-2xl">
              <p className="text-brand-teal flex items-center gap-2 text-xs font-extrabold tracking-[0.12em] uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="bg-brand-teal absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping" />
                  <span className="bg-brand-teal relative inline-flex h-2 w-2 rounded-full" />
                </span>
                {t('landing.communityBadge')}
              </p>
              <h2 className="text-brand-blue mt-3 text-2xl font-extrabold text-balance md:text-4xl">
                {t('landing.communityTitle')}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed md:text-base">
                {t('landing.communityBody')}
              </p>
            </header>

            {/* on phones the counters sit in a band under the map, so they never hide a city */}
            <figure className="relative mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-[#F1F6FB] pb-[5.25rem] md:pb-0">
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
                    className="absolute inset-0 h-full w-full select-none"
                    draggable={false}
                  />
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(73,184,173,0.10)_43%,transparent_63%)] motion-reduce:hidden"
                    initial={{ x: '-120%' }}
                    animate={{ x: '120%' }}
                    transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                  />

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

              {/* live counters on the map: bottom-left over the ocean on computers (in every
                  language, since the map runs left to right), in the band under it on phones */}
              <dl className="absolute inset-x-3 bottom-3 z-10 grid grid-cols-3 gap-2 md:inset-x-auto md:bottom-5 md:left-5 md:w-52 md:grid-cols-1">
                {metrics.map(({ label, value, live }) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-xl border border-slate-100 bg-white/90 px-2.5 py-2 shadow-lg shadow-[#2F76BB]/10 backdrop-blur-sm sm:px-3 md:px-4 md:py-3"
                  >
                    <dt className="flex items-center gap-1.5 text-[9px] leading-tight font-bold text-slate-500 uppercase sm:text-[10px] sm:tracking-wide md:text-xs">
                      {live && (
                        <span className="bg-brand-teal h-1.5 w-1.5 shrink-0 rounded-full motion-safe:animate-pulse" />
                      )}
                      {label}
                    </dt>
                    {/* each new number slides in; not on the first render, so the HTML matches
                        the server's */}
                    <dd
                      className={`relative mt-0.5 overflow-hidden text-lg font-extrabold tabular-nums md:text-2xl ${live ? 'text-brand-teal' : 'text-brand-navy'}`}
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
                  </div>
                ))}
              </dl>
            </figure>

            <footer className="text-muted-foreground relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm">
              <span className="flex items-center gap-2">
                <span className="bg-brand-teal h-2 w-2 rounded-full shadow-[0_0_0_2px_#FFFFFF,0_0_8px_rgba(73,184,173,0.7)]" />
                {t('landing.communityLegendApprox')}
              </span>
              <span>{t('landing.communityLegendHint')}</span>
              <span className="md:hidden">{t('landing.communityLegendSwipe')}</span>
              <span className="text-brand-teal font-semibold">
                ● {t('landing.communityLegendLive')}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600 ltr:ml-auto rtl:mr-auto">
                {t('landing.communitySample')}
              </span>
            </footer>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
