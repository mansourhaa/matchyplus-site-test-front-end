'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { CommunityArcs } from './community-arcs';
import {
  CITY_POINTS,
  type CityId,
  HUB_ID,
  MAP_HEIGHT,
  MAP_WIDTH,
  toCityNames,
} from './community-map';
import { CommunityMarker } from './community-marker';
import { CommunityTooltip } from './community-tooltip';
import { EDGE_FADE, Reveal } from './motion';

/** Where the phone view of the map starts: Tunis, in % of the map width. */
const MOBILE_FOCUS_X = 52.7;

/**
 * Matchy+'s ambition: a world map with the highlighted countries, the cities, lines from Tunis
 * and a tooltip per city. No figures: the content brief allows only sourced numbers, so plug
 * real, defined KPIs (see community-map.ts) before showing any.
 * Animations are hidden with CSS for "reduce motion", never with JS, so the server and the
 * browser always render the same HTML.
 */
export function LiveCommunity() {
  const { t, dir, tRows } = useI18n();
  const cities = toCityNames(tRows('landing.communityCities'));

  const locations = CITY_POINTS;
  const [selectedId, setSelectedId] = useState<CityId | null>(null);

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

  const hub = CITY_POINTS.find((location) => location.id === HUB_ID);
  const routes = CITY_POINTS.filter((location) => location.id !== HUB_ID);

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
                  src="/matchy/community/world-map.svg"
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
                    label={cities[location.id] ?? location.id}
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

                <div role="status" aria-live="polite">
                  {selected && (
                    <CommunityTooltip
                      location={selected}
                      city={cities[selected.id] ?? selected.id}
                      dir={dir}
                    />
                  )}
                </div>
              </div>
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
