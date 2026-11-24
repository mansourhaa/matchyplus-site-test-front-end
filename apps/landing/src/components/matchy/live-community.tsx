'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { CommunityArcs } from './community-arcs';
import { type CommunityMetric, CounterRow, FloatingCounters } from './community-counters';
import {
  COUNTRY_POINTS,
  type CountryId,
  HUB_ID,
  MAP_HEIGHT,
  MAP_WIDTH,
  SEARCH_CONSOLE,
  numberLocale,
  toCountryNames,
} from './community-map';
import { CommunityMarker } from './community-marker';
import { CommunityTooltip } from './community-tooltip';
import { EDGE_FADE, Reveal } from './motion';

/** Where the phone view of the map starts: Tunisia, in % of the map width. */
const MOBILE_FOCUS_X = 52.5;

/**
 * Matchy+'s ambition: a world map with the highlighted countries, the cities, lines from Tunis
 * and a tooltip per country. The figures are real Google Search Console numbers (see
 * community-map.ts); by the manager's choice the source line is not shown on the page.
 * Animations are hidden with CSS for "reduce motion", never with JS, so the server and the
 * browser always render the same HTML.
 */
export function LiveCommunity() {
  const { t, locale, dir, tRows } = useI18n();
  const countries = toCountryNames(tRows('landing.communityCountries'));
  const format = new Intl.NumberFormat(numberLocale(locale));

  const locations = COUNTRY_POINTS;
  const [selectedId, setSelectedId] = useState<CountryId | null>(null);
  const metrics: CommunityMetric[] = [
    {
      // the countries shown on the map (the top 10 of Search Console), as "10 pays"
      label: t('landing.communityCountriesLabel'),
      value: COUNTRY_POINTS.length,
      unit: t('landing.communityCountriesUnit'),
      headline: true,
    },
    {
      label: t('landing.communityImpressionsLabel'),
      value: SEARCH_CONSOLE.impressions,
      headline: false,
    },
  ];

  // On phones the map is wider than the screen and scrolls sideways: it starts on Tunisia,
  // and a tapped country slides to the middle so its tooltip is fully visible.
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

  const hub = COUNTRY_POINTS.find((location) => location.id === HUB_ID);
  const routes = COUNTRY_POINTS.filter((location) => location.id !== HUB_ID);

  const selected = locations.find((location) => location.id === selectedId);

  return (
    <section className="relative z-10 bg-white py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        {/* same heading as the other sections */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-brand-teal mb-2 text-sm font-semibold tracking-wide">
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
                  src="/matchy/community/world-map-v2.svg"
                  alt={t('landing.communityMapLabel')}
                  width={MAP_WIDTH}
                  height={MAP_HEIGHT}
                  unoptimized
                  className={`absolute inset-0 h-full w-full select-none ${EDGE_FADE}`}
                  draggable={false}
                />
                {/* light sweep, with the same faded edges as the map so it never shows as a box */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden ${EDGE_FADE}`}
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
                    label={countries[location.id] ?? location.id}
                    selected={location.id === selectedId}
                    hub={location.id === HUB_ID}
                    onShow={() => setSelectedId(location.id)}
                    onHide={() => setSelectedId(null)}
                    onTap={() => {
                      setSelectedId(location.id);
                      centerOn(location.x, 'smooth');
                    }}
                  />
                ))}

                {/* counters, floating over the oceans (computers only) */}
                <FloatingCounters metrics={metrics} format={format} dir={dir} />

                <div role="status" aria-live="polite">
                  {selected && (
                    <CommunityTooltip
                      location={selected}
                      city={countries[selected.id] ?? selected.id}
                      dir={dir}
                    />
                  )}
                </div>
              </div>
            </div>
          </figure>

          {/* phones: the counters sit in a row under the map */}
          <CounterRow metrics={metrics} format={format} />
        </Reveal>
      </div>
    </section>
  );
}
