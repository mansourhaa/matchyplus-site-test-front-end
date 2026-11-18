// @vitest-environment jsdom
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { type Locale, SUPPORTED_LOCALES, getMessage, messages } from '@/features/i18n/messages';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CompanyStory } from './company-story';
import { HeroLivePhone } from './hero-live-phone';
import { HeroSearch, buildSearchUrl } from './hero-search';
import { LiveCommunity } from './live-community';
import { Partnerships } from './partnerships';
import { ProBranding } from './pro-branding';
import { WhyMatchy } from './why-matchy';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/fr/',
}));

function renderIn(locale: Locale, ui: ReactNode) {
  return render(<I18nProvider locale={locale}>{ui}</I18nProvider>);
}

const NEW_KEYS = [
  'heroLive',
  'heroPhoneTabs',
  'searchTabClient',
  'searchTabPro',
  'searchTabBusiness',
  'searchPopular',
  'searchMember',
  'whyTitle',
  'whyBefore',
  'whyAfter',
  'brandTitle',
  'brandPoints',
  'brandSampleStats',
  'storyQuote',
  'storyBody',
  'partnersTitle',
  'partnersBenefits',
  'partnersCta',
  'communityTitle',
  'communityActive',
  'communityToday',
  'communityCountries',
  'communityVisitors',
  'communityMapLabel',
  'communityLegendSwipe',
  'communityCities',
];

describe('new home texts', () => {
  it.each(NEW_KEYS)('"%s" exists in every language with the same shape', (key) => {
    const fr = getMessage(messages.fr, `landing.${key}`);
    expect(fr).toBeDefined();
    for (const locale of SUPPORTED_LOCALES) {
      const value = getMessage(messages[locale], `landing.${key}`);
      expect(value, `${locale}.${key}`).toBeDefined();
      if (Array.isArray(fr)) expect((value as unknown[]).length).toBe(fr.length);
    }
  });
});

describe('buildSearchUrl', () => {
  it('carries the trimmed service and city', () => {
    expect(buildSearchUrl('https://app.matchyplus.com/register', ' Plombier ', 'Sfax')).toBe(
      'https://app.matchyplus.com/register?service=Plombier&ville=Sfax',
    );
  });

  it('leaves empty fields out', () => {
    expect(buildSearchUrl('https://app.matchyplus.com/register', '', '  ')).toBe(
      'https://app.matchyplus.com/register',
    );
  });
});

describe('HeroSearch', () => {
  it('starts on "Je cherche un pro" with the search form', () => {
    renderIn('fr', <HeroSearch />);
    expect(screen.getByRole('button', { name: 'Je cherche un pro' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Quel service ?')).toBeInTheDocument();
    expect(screen.getByLabelText('Où ?')).toBeInTheDocument();
  });

  it('a popular chip fills the service field', () => {
    renderIn('fr', <HeroSearch />);
    fireEvent.click(screen.getByRole('button', { name: 'Électricien' }));
    expect(screen.getByLabelText('Quel service ?')).toHaveValue('Électricien');
  });

  it('"Entreprise" leads to the partner page of the current language', () => {
    renderIn('fr', <HeroSearch />);
    fireEvent.click(screen.getByRole('button', { name: 'Entreprise' }));
    // next/link drops the trailing slash in tests; the site adds it back (trailingSlash).
    expect(screen.getByRole('link', { name: /Devenir partenaire/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/fr\/devenir-partenaire\/?$/),
    );
  });
});

describe('HeroLivePhone', () => {
  it.each([
    ['en', ['Pass', 'Connect', 'Home', 'Search', 'Matches', 'Profile']],
    ['ar', ['تخطي', 'تواصل', 'الرئيسية', 'بحث', 'التطابقات', 'الملف']],
  ] as const)(
    'shows the app buttons and tabs in %s, not the screenshot French',
    (locale, labels) => {
      renderIn(locale, <HeroLivePhone alt="" />);
      for (const label of labels) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      expect(screen.queryByText('Accueil')).toBeNull();
    },
  );
});

describe('HeroSearch login', () => {
  it('keeps a sign-in link for members, since the hero buttons are gone', () => {
    renderIn('fr', <HeroSearch />);
    expect(screen.getByRole('link', { name: /Connexion/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/connexion$/),
    );
  });
});

describe('home sections', () => {
  it('WhyMatchy lists both sides', () => {
    renderIn('fr', <WhyMatchy />);
    expect(screen.getByRole('heading', { name: 'Sans Matchy+' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Avec Matchy+' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });

  it('ProBranding uses the belt sample plumber', () => {
    renderIn('ar', <ProBranding />);
    const plumber = (getMessage(messages.ar, 'landing.beltProfiles') as string[][]).find(
      ([code]) => code === 'PLB',
    );
    expect(screen.getByText(plumber?.[1] ?? '')).toBeInTheDocument();
    // the referral code and points now live in the pro card
    expect(screen.getByText('MP-7K2Q9')).toBeInTheDocument();
    expect(
      screen.getByText(getMessage(messages.ar, 'landing.referralYou') as string),
    ).toBeInTheDocument();
  });

  it('CompanyStory links to the about page', () => {
    renderIn('en', <CompanyStory />);
    expect(screen.getByRole('link', { name: /Discover our story/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/en\/about-us\/?$/),
    );
  });

  it('Partnerships shows three benefits and the partner link', () => {
    renderIn('fr', <Partnerships />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    // next/link drops the trailing slash in tests; the site adds it back (trailingSlash).
    expect(screen.getByRole('link', { name: /Devenir partenaire/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/fr\/devenir-partenaire\/?$/),
    );
  });

  it('LiveCommunity shows the map, the counters and a tooltip per city, clearly labelled', () => {
    renderIn('fr', <LiveCommunity />);
    expect(
      screen.getByRole('heading', { name: 'La communauté Matchy+ en temps réel' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Carte du monde/ })).toBeInTheDocument();
    expect(screen.getByText('Données d’exemple')).toBeInTheDocument();
    // 1 284 active visitors in 9 countries (narrow no-break space in French). The counters exist
    // twice: on the map for computers and under it for phones; CSS shows one or the other.
    expect(screen.getAllByText(/^1\s?284$/)).toHaveLength(2);
    expect(screen.getAllByText('9')).toHaveLength(2);

    const tunis = screen.getByRole('button', { name: /^Tunis, Tunisie : 312 visiteurs actifs$/ });
    fireEvent.pointerEnter(tunis, { pointerType: 'mouse' });
    expect(within(screen.getByRole('status')).getByText('Tunis, Tunisie')).toBeInTheDocument();
    // a touch leaving the point (the map slid under the finger) keeps the tooltip open
    fireEvent.pointerLeave(tunis, { pointerType: 'touch' });
    expect(within(screen.getByRole('status')).getByText('Tunis, Tunisie')).toBeInTheDocument();
    fireEvent.pointerLeave(tunis, { pointerType: 'mouse' });
    expect(within(screen.getByRole('status')).queryByText('Tunis, Tunisie')).toBeNull();
  });
});
