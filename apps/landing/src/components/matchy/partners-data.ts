/**
 * Matchy+'s partners. `PARTNERS` is "Nos partenaires" on the home page; `NETWORK_PARTNERS` is the
 * strip "Ils avancent avec Matchy+" and the /partenaires/ page.
 * To add one: put its logo in public/matchy/partners/ (with a new file name when it changes), add
 * a line here with the logo's real size (so the page never jumps while it loads), and its one-line
 * description in `landing.partnerDescriptions` (fr/en/ar), under the same id.
 */
export type Partner = {
  /** Key of its description in `landing.partnerDescriptions`. */
  id: string;
  name: string;
  logo: string;
  width: number;
  height: number;
  /** Their website; without one, the partner shows no "Visiter le site" link. */
  url?: string;
  /**
   * For a logo that is a photo banner: it covers its whole card, and this `object-position` keeps
   * the brand name in view (e.g. 'right bottom' when the name is at the bottom right).
   */
  cover?: string;
};

export const PARTNERS: readonly Partner[] = [
  {
    id: 'dotit',
    name: 'DOT-IT',
    // horizontal vector logo (sent 24 Nov 2026), cleaned of the editor data
    logo: '/matchy/partners/dotit-logo.svg',
    width: 394,
    height: 148,
    url: 'https://www.dotit-tn.com/fr',
  },
  {
    id: 'tca',
    name: 'TCA – Tunisie Commissariat aux Comptes',
    logo: '/matchy/partners/tca-logo.webp',
    width: 415,
    height: 138,
    url: 'https://tcasamitouzi.com/',
  },
];

/** "Ils avancent avec Matchy+" and /partenaires/: the partners Matchy+ works with day to day. */
export const NETWORK_PARTNERS: readonly Partner[] = [
  {
    id: 'sahora',
    name: 'Sahora',
    logo: '/matchy/partners/sahora.webp',
    width: 640,
    height: 360,
    cover: 'right bottom',
  },
  {
    id: 'proservices',
    name: 'Pro Services Maintenance',
    logo: '/matchy/partners/pro-services-maintenance.webp',
    width: 640,
    height: 153,
  },
];
