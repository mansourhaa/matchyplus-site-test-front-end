/**
 * Matchy+'s real partners, shown in "Nos partenaires" (under the map) and in the partners strip.
 * To add one: put its logo in public/matchy/partners/ (with a new file name when it changes) and
 * add a line here with the logo's real size, so the page never jumps while it loads.
 */
export type Partner = {
  name: string;
  logo: string;
  width: number;
  height: number;
  url: string;
};

export const PARTNERS: readonly Partner[] = [
  {
    name: 'DOT-IT',
    logo: '/matchy/partners/dotit.webp',
    width: 320,
    height: 320,
    url: 'https://www.dotit-tn.com/fr',
  },
  {
    name: 'GoPayzi',
    logo: '/matchy/partners/gopayzi-logo.svg',
    width: 512,
    height: 138,
    url: 'https://pitchbook.com/profiles/company/494307-91',
  },
  {
    name: 'TCA – Tunisie Commissariat aux Comptes',
    logo: '/matchy/partners/tca-logo.webp',
    width: 415,
    height: 138,
    url: 'https://tcasamitouzi.com/',
  },
];
