/**
 * Matchy+'s real partners, shown in the partners strip, in "Nos partenaires" and on /partenaires/.
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
  url: string;
};

export const PARTNERS: readonly Partner[] = [
  {
    id: 'dotit',
    name: 'DOT-IT',
    logo: '/matchy/partners/dotit.webp',
    width: 320,
    height: 320,
    url: 'https://www.dotit-tn.com/fr',
  },
  {
    id: 'gopayzi',
    name: 'GoPayzi',
    logo: '/matchy/partners/gopayzi-logo.svg',
    width: 512,
    height: 138,
    url: 'https://pitchbook.com/profiles/company/494307-91',
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
