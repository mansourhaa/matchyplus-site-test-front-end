import { type CommunityLocation, tooltipPlacement } from './community-map';

const TOOLTIP_ALIGN = {
  start: '-translate-x-4',
  center: '-translate-x-1/2',
  end: '-translate-x-[calc(100%-1rem)]',
} as const;

/** City tooltip on the map: opens towards the inside of the map so it is never cut off. */
export function CommunityTooltip({
  location,
  city,
  visitors,
  dir,
}: {
  location: CommunityLocation;
  city: string;
  /** "{count} visiteurs", already translated. */
  visitors: string;
  /** Page direction: the map is left-to-right, the tooltip's text follows the page language. */
  dir: 'ltr' | 'rtl';
}) {
  const placement = tooltipPlacement(location.x, location.y);
  return (
    <div
      className={`bg-brand-navy pointer-events-none absolute z-20 min-w-40 rounded-xl px-3 py-2 text-white shadow-xl ${TOOLTIP_ALIGN[placement.align]} ${placement.below ? 'translate-y-4' : '-translate-y-[calc(100%+1rem)]'}`}
      style={{ left: `${location.x}%`, top: `${location.y}%` }}
    >
      <p dir={dir} className="text-sm font-bold">
        {city}
      </p>
      <p dir={dir} className="text-xs text-white/70">
        {visitors}
      </p>
    </div>
  );
}
