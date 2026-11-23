// @vitest-environment jsdom
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { type Locale, SUPPORTED_LOCALES, getMessage, messages } from '@/features/i18n/messages';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CompanyStory } from './company-story';
import { HeroLivePhone } from './hero-live-phone';
import { HeroSearch } from './hero-search';
import { LiveCommunity } from './live-community';
import { PartnerLogos } from './partner-logos';
import { Partnerships } from './partnerships';
import { Press } from './press';
import { PRESS_ITEMS, pressItems } from './press-data';
import { PressArticle, PressList } from './press-pages';
import { ProBranding } from './pro-branding';
import { WhyMatchy } from './why-matchy';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/fr/',
}));

function renderIn(locale: Locale, ui: ReactNode) {
  return render(<I18nProvider locale={locale}>{ui}</I18nProvider>);
}

const NEW_KEYS = [
  'pressKicker',
  'pressTitle',
  'pressSubtitle',
  'pressAll',
  'pressSample',
  'pressPageTitle',
  'pressVideo',
  'pressLinkedin',
  'ourPartnersTitle',
  'ourPartnersBody',
  'ourPartnersVisit',
  'usageTitle',
  'usageBody',
  'heroLive',
  'heroPhoneTabs',
  'searchTabClient',
  'searchTabPro',
  'searchTabBusiness',
  'searchPopular',
  'searchMember',
  'resultsTitle',
  'resultsNear',
  'resultsSearching',
  'resultsCta',
  'resultsSample',
  'whyTitle',
  'whyBefore',
  'whyAfter',
  'brandTitle',
  'brandPoints',
  'brandSampleStats',
  'storyQuote',
  'storyBody',
  'partnersTitle',
  'partnersCta',
  'partnersSlot',
  'communityTitle',
  'communityPresence',
  'communityAudience',
  'communityVisitors',
  'communityMapLabel',
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

  it('a search opens the results page of the current language, with the search', () => {
    renderIn('fr', <HeroSearch />);
    fireEvent.change(screen.getByLabelText('Quel service ?'), { target: { value: 'Plombier' } });
    fireEvent.change(screen.getByLabelText('Où ?'), { target: { value: 'Sfax' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(push).toHaveBeenCalledWith('/fr/recherche/?service=Plombier&ville=Sfax');
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

  it('Partnerships strip: free places lead to the partner page, out of the tab order', () => {
    const { container } = renderIn('fr', <Partnerships />);
    // the strip is decorative, so its links are not in the accessibility tree: query the DOM
    const slots = [...container.querySelectorAll('[aria-hidden="true"] a')];
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot).toHaveTextContent('Votre marque ici');
      expect(slot).toHaveAttribute('tabindex', '-1');
      expect(slot.getAttribute('href')).toMatch(/^\/fr\/devenir-partenaire\/?$/);
    }
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
    // the sign-up button is inside the card; the card has no "sample profile" line
    const cta = screen.getByRole('link', {
      name: getMessage(messages.ar, 'landing.brandCta') as string,
    });
    expect(cta.closest('.rounded-\\[2rem\\]')).not.toBeNull();
    expect(
      screen.queryByText(getMessage(messages.ar, 'landing.beltSample') as string),
    ).not.toBeInTheDocument();
  });

  it('CompanyStory shows the founder photo, described for screen readers', () => {
    renderIn('fr', <CompanyStory />);
    const photo = screen.getByRole('img', { name: 'Portrait de la fondatrice de Matchy+' });
    expect(photo.getAttribute('src')).toContain('founder.webp');
    expect(screen.queryByText('[Photo du fondateur]')).toBeNull();
  });

  it('CompanyStory links to the about page', () => {
    renderIn('en', <CompanyStory />);
    expect(screen.getByRole('link', { name: /Discover our story/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/en\/about-us\/?$/),
    );
  });

  it('Partnerships shows the heading and the partner link', () => {
    renderIn('fr', <Partnerships />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    // next/link drops the trailing slash in tests; the site adds it back (trailingSlash).
    expect(screen.getByRole('link', { name: /Devenir partenaire/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/fr\/devenir-partenaire\/?$/),
    );
  });

  it('LiveCommunity shows the map, the counters and a tooltip per city', () => {
    renderIn('fr', <LiveCommunity />);
    expect(
      screen.getByRole('heading', {
        name: 'Matchy+ attire des professionnels dans plusieurs pays',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Carte du monde/ })).toBeInTheDocument();
    // the legend line under the map was removed at the manager's request
    expect(screen.queryByText('Position approximative')).not.toBeInTheDocument();
    // 233 visitors on the map and an audience of 1 240 (narrow no-break space in French). The counters exist
    // twice: on the map for computers and under it for phones; CSS shows one or the other.
    expect(screen.getAllByText('233')).toHaveLength(2);
    expect(screen.getAllByText(/^1\s?240$/)).toHaveLength(2);
    expect(screen.getAllByText('Présence internationale')).toHaveLength(2);
    expect(screen.getAllByText('Audience Matchy+')).toHaveLength(2);
    // no "active now" wording and no country count any more
    expect(screen.queryByText(/actifs/i)).toBeNull();
    expect(screen.queryByText('Pays')).toBeNull();

    const tunis = screen.getByRole('button', { name: /^Tunis, Tunisie : 72 visiteurs$/ });
    fireEvent.pointerEnter(tunis, { pointerType: 'mouse' });
    expect(within(screen.getByRole('status')).getByText('Tunis, Tunisie')).toBeInTheDocument();
    // a touch leaving the point (the map slid under the finger) keeps the tooltip open
    fireEvent.pointerLeave(tunis, { pointerType: 'touch' });
    expect(within(screen.getByRole('status')).getByText('Tunis, Tunisie')).toBeInTheDocument();
    fireEvent.pointerLeave(tunis, { pointerType: 'mouse' });
    expect(within(screen.getByRole('status')).queryByText('Tunis, Tunisie')).toBeNull();
  });
});

describe('Matchy+ Press and partners', () => {
  it('Press shows the 3 latest news, each opening its page, and a link to all the news', () => {
    renderIn('fr', <Press />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Les dernières actualités de Matchy+',
    );
    const latest = pressItems().slice(0, 3);
    for (const item of latest) {
      // each title is announced once per card (the big cover title is hidden from screen readers)
      expect(screen.getAllByRole('heading', { level: 3, name: item.text.fr.title })).toHaveLength(
        1,
      );
      const heading = screen.getAllByRole('heading', { level: 3, name: item.text.fr.title })[0];
      expect(heading.closest('a')).toHaveAttribute(
        'href',
        expect.stringMatching(new RegExp(`^/fr/actualites/${item.slug}/?$`)),
      );
    }
    expect(screen.getByRole('link', { name: 'Toutes les actualités' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/fr\/actualites\/?$/),
    );
  });

  it('only sample news are labelled as samples', () => {
    renderIn('fr', <PressList />);
    const samples = PRESS_ITEMS.filter((item) => item.sample).length;
    expect(screen.queryAllByText('Exemple')).toHaveLength(samples);
  });

  it('an article with a LinkedIn post links to it in a new tab', () => {
    const item = PRESS_ITEMS.find((entry) => entry.linkedin);
    if (!item) return;
    renderIn('fr', <PressArticle slug={item.slug} />);
    const link = screen.getByRole('link', { name: 'Voir la publication sur LinkedIn' });
    expect(link).toHaveAttribute('href', item.linkedin);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('an article shows its texts in the page language and links back to all news', () => {
    const item = PRESS_ITEMS[0];
    renderIn('ar', <PressArticle slug={item.slug} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(item.text.ar.title);
    for (const paragraph of item.text.ar.body)
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'كل الأخبار' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/ar\/actualites\/?$/),
    );
  });

  it('an article with a YouTube link embeds it without cookies; an unknown slug renders nothing', () => {
    const original = PRESS_ITEMS[0].video;
    PRESS_ITEMS[0].video = 'https://youtu.be/dQw4w9WgXcQ';
    try {
      const { container } = renderIn('fr', <PressArticle slug={PRESS_ITEMS[0].slug} />);
      expect(container.querySelector('iframe')).toHaveAttribute(
        'src',
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      );
      expect(container.querySelector('iframe')).toHaveAttribute(
        'referrerpolicy',
        'strict-origin-when-cross-origin',
      );
    } finally {
      PRESS_ITEMS[0].video = original;
    }
    const { container } = renderIn('fr', <PressArticle slug="missing" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Nos partenaires links each logo to the partner site in a new tab', () => {
    renderIn('fr', <PartnerLogos />);
    expect(screen.getByRole('heading', { level: 2, name: 'Nos partenaires' })).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link.getAttribute('href')).toMatch(/^https:\/\//);
    }
    expect(
      screen.getByRole('link', { name: 'Site de DOT-IT (nouvel onglet)' }),
    ).toBeInTheDocument();
  });
});
