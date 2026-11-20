'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { CommunityArcs } from './community-arcs';
import { type CommunityMetric, CounterRow, FloatingCounters } from './community-counters';
import {
  type CityId,
  HUB_ID,
  MAP_HEIGHT,
  MAP_WIDTH,
  SAMPLE_AUDIENCE,
  SAMPLE_LOCATIONS,
  nudge,
  numberLocale,
  toCityNames,
  totalVisitors,
} from './community-map';
import { CommunityMarker } from './community-marker';
import { CommunityTooltip } from './community-tooltip';
import { Reveal } from './motion';

/** Time between two sample updates, in ms. */
const UPDATE_EVERY = 1800;

/** Where the phone view of the map starts: Tunis, in % of the map width. */
const MOBILE_FOCUS_X = 52.7;

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
  const { t, locale, dir, tRows } = useI18n();
  const cities = toCityNames(tRows('landing.communityCities'));
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

  const selected = locations.find((location) => location.id === selectedId);
  const metrics: CommunityMetric[] = [
    { label: t('landing.communityPresence'), value: totalVisitors(locations), headline: true },
    { label: t('landing.communityAudience'), value: audience, headline: false },
  ];

  return (
    <section ref={sectionRef} className="relative z-10 bg-[#F7FAFD] py-20 md:py-24">
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
                {hub && <CommunityArcs hub={hub} routes={routes} />}

                {locations.map((location, index) => (
                  <CommunityMarker
                    key={location.id}
                    location={location}
                    index={index}
                    label={`${cities[location.id] ?? location.id} : ${t('landing.communityVisitors', { count: format.format(location.count) })}`}
                    selected={location.id === selectedId}
                    hub={location.id === HUB_ID}
                    arrivalKey={arrival?.id === location.id ? arrival.key : null}
                    onShow={() => setSelectedId(location.id)}
                    onHide={() => setSelectedId(null)}
                    onTap={() => {
                      setSelectedId(location.id);
                      centerOn(location.x, 'smooth');
                    }}
                  />
                ))}

                {/* counters, floating over the map (computers only) */}
                <FloatingCounters metrics={metrics} format={format} dir={dir} />

                <div role="status" aria-live="polite">
                  {selected && (
                    <CommunityTooltip
                      location={selected}
                      city={cities[selected.id] ?? selected.id}
                      visitors={t('landing.communityVisitors', {
                        count: format.format(selected.count),
                      })}
                      dir={dir}
                    />
                  )}
                </div>
              </div>
            </div>
          </figure>

          {/* phones: the counters sit in a row under the map */}
          <CounterRow metrics={metrics} format={format} />

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
    </section>
  );
}
