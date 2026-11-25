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
import { PARTNER_BENEFITS } from './partner-benefits';
import { PartnerLogos } from './partner-logos';
import { NETWORK_PARTNERS, PARTNERS } from './partners-data';
import { PartnersPage } from './partners-page';
import { Partnerships } from './partnerships';
import { Press } from './press';
import { PRESS_ITEMS, pressItems } from './press-data';
import { PressArticle, PressList } from './press-pages';
import { ProBranding } from './pro-branding';
import { STORY } from './story-data';
import { StoryPage } from './story-page';
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
  'pressNextArticle',
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
  'searchMember',
  'resultsTitle',
  'resultsCountLabel',
  'resultsSearching',
  'resultsCta',
  'whyTitle',
  'whyBefore',
  'whyAfter',
  'brandTitle',
  'brandPoints',
  'brandSampleStats',
  'storyQuote',
  'partnersTitle',
  'partnersCta',
  'partnersSlot',
  'partnerDescriptions',
  'partnersPageTitle',
  'partnersPageBenefitsTitle',
  'footerProsTitle',
  'footerLegalTitle',
  'footerSoon',
  'ourPartnersKicker',
  'communityTitle',
  'communityMapLabel',
  'communityCountries',
  'communityCountriesLabel',
  'communityCountriesUnit',
  'communityVisitorsLabel',
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
    fireEvent.change(screen.getByLabelText('Quel service ?'), {
      target: { value: 'Plombier' },
    });
    fireEvent.change(screen.getByLabelText('Où ?'), {
      target: { value: 'Sfax' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(push).toHaveBeenCalledWith('/fr/recherche/?service=Plombier&ville=Sfax');
  });

  it('has no popular suggestions under the search', () => {
    renderIn('fr', <HeroSearch />);
    expect(screen.queryByText('Populaire :')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Électricien' })).toBeNull();
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
      expect.stringMatching(/\/connexion\?lang=fr$/),
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
    expect(screen.queryByText('ملف تجريبي')).not.toBeInTheDocument();
  });

  it('CompanyStory shows the Matchy+ logo, described for screen readers', () => {
    renderIn('fr', <CompanyStory />);
    const logo = screen.getByRole('img', { name: 'Logo Matchy+' });
    expect(logo.getAttribute('src')).toContain('matchy-plus-logo.svg');
    // the sentence about the founder's path was removed (24 Nov 2026)
    expect(screen.queryByText(/enseignement/)).toBeNull();
  });

  it('CompanyStory links to the story page', () => {
    renderIn('en', <CompanyStory />);
    expect(screen.getByRole('link', { name: /Discover our story/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/en\/about\/matchy-plus-story\/?$/),
    );
  });

  it('Story page follows the document: founders, parts, bold words, and a button per reader', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const { container, unmount } = renderIn(locale, <StoryPage />);
      const text = STORY[locale];
      expect(screen.getByRole('heading', { level: 1, name: text.title })).toBeInTheDocument();
      const blocks = text.parts.flatMap((part) => part.blocks);
      // both founders' quotes, signed with the name and the role
      for (const block of blocks) {
        if (typeof block === 'string' || !('founder' in block)) continue;
        expect(screen.getByText(block.founder.text)).toBeInTheDocument();
        expect(screen.getByText(block.founder.name)).toHaveClass('font-bold');
        expect(screen.getByText(block.founder.role)).toHaveClass('italic');
      }
      for (const part of text.parts) {
        if (part.heading) {
          expect(screen.getByRole('heading', { level: 2, name: part.heading })).toBeInTheDocument();
        }
      }
      // the document's bold words are bold, and no "**" mark shows
      expect(container.querySelectorAll('strong').length).toBeGreaterThanOrEqual(4);
      expect(container.textContent).not.toContain('**');
      // no boxes: no card, no shadowed panel around the story
      expect(container.querySelector('figure.shadow-xl, section.rounded-3xl')).toBeNull();
      expect(screen.getByRole('link', { name: text.next.find[1] })).toHaveAttribute(
        'href',
        expect.stringMatching(new RegExp(`^/${locale}/recherche/?$`)),
      );
      // the app opens in the page's language
      expect(screen.getByRole('link', { name: text.next.profile[1] })).toHaveAttribute(
        'href',
        expect.stringMatching(new RegExp(`/register\\?lang=${locale}$`)),
      );
      expect(screen.getByRole('link', { name: text.next.build[1] })).toHaveAttribute(
        'href',
        expect.stringMatching(new RegExp(`^/${locale}/devenir-partenaire/?$`)),
      );
      unmount();
    }
  });

  it('DOT-IT uses its new horizontal vector logo', () => {
    const dotit = PARTNERS.find((partner) => partner.id === 'dotit');
    expect(dotit?.logo).toBe('/matchy/partners/dotit-logo.svg');
    expect([dotit?.width, dotit?.height]).toEqual([394, 148]);
  });

  it('Partnerships strip shows the real partner logos, and free places lead to the partner page', () => {
    const { container } = renderIn('fr', <Partnerships />);
    // the strip is decorative, so its links and logos are not in the accessibility tree
    const strip = container.querySelector('[aria-hidden="true"]');
    const logos = [...(strip?.querySelectorAll('img') ?? [])].map((img) => img.getAttribute('src'));
    // the strip shows the network partners only: Sahora and Pro Services
    for (const other of ['tca', 'dotit', 'gopayzi']) {
      expect(logos.some((src) => src?.includes(other))).toBe(false);
    }
    for (const partner of NETWORK_PARTNERS) {
      expect(logos.some((src) => src?.includes(partner.logo.split('/').pop() ?? ''))).toBe(true);
    }
    expect(strip?.textContent).not.toMatch(/\[/);
    const slots = [...(strip?.querySelectorAll('a') ?? [])];
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot).toHaveTextContent('Votre marque ici');
      expect(slot).toHaveAttribute('tabindex', '-1');
      expect(slot.getAttribute('href')).toMatch(/^\/fr\/devenir-partenaire\/?$/);
    }
    expect(screen.getByRole('link', { name: /Devenir partenaire/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/fr\/devenir-partenaire\/?$/),
    );
  });

  it('Partners page lists every partner with its description and website, then the benefits', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const { unmount } = renderIn(locale, <PartnersPage />);
      const descriptions = getMessage(
        messages[locale],
        'landing.partnerDescriptions',
      ) as string[][];
      for (const partner of NETWORK_PARTNERS) {
        expect(screen.getByRole('heading', { level: 2, name: partner.name })).toBeInTheDocument();
        const description = descriptions.find(([id]) => id === partner.id)?.[1];
        expect(description?.trim()).toBeTruthy();
        expect(screen.getByText(description ?? '')).toBeInTheDocument();
      }
      const sites = screen.getAllByRole('link').filter((link) => link.getAttribute('target'));
      // only partners with a website get a link
      expect(sites.map((link) => link.getAttribute('href'))).toEqual(
        NETWORK_PARTNERS.flatMap((p) => (p.url ? [p.url] : [])),
      );
      for (const site of sites) expect(site).toHaveAttribute('rel', 'noopener noreferrer');
      for (const benefit of PARTNER_BENEFITS[locale]) {
        expect(screen.getByRole('heading', { level: 3, name: benefit.title })).toBeInTheDocument();
      }
      expect(screen.getByRole('link', { name: /partenaire|partner|شريك/i })).toHaveAttribute(
        'href',
        expect.stringMatching(new RegExp(`^/${locale}/devenir-partenaire/?$`)),
      );
      unmount();
    }
  });

  it('LiveCommunity shows the Search Console figures and a tooltip per country, with no source line', () => {
    renderIn('fr', <LiveCommunity />);
    expect(
      screen.getByRole('heading', {
        name: 'Matchy+ attire des professionnels dans plusieurs pays',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Carte du monde/ })).toBeInTheDocument();
    // the counters exist twice: on the map for computers and under it for phones
    // the countries counter: "10 pays" (the 10 points of the map), with no pulsing dot
    expect(screen.getAllByText('10')).toHaveLength(2);
    expect(screen.getAllByText('pays')).toHaveLength(2);
    expect(document.querySelector('dt .animate-pulse, dt .motion-safe\\:animate-pulse')).toBeNull();
    expect(screen.getAllByText('452')).toHaveLength(2);
    expect(screen.getAllByText('Présence internationale')).toHaveLength(2);
    expect(screen.getAllByText('Visiteurs actifs')).toHaveLength(2);
    expect(screen.queryByText(/Source|Google/)).toBeNull();

    const tunis = screen.getByRole('button', { name: 'Tunisie' });
    fireEvent.pointerEnter(tunis, { pointerType: 'mouse' });
    expect(within(screen.getByRole('status')).getByText('Tunisie')).toBeInTheDocument();
    // a touch leaving the point (the map slid under the finger) keeps the tooltip open
    fireEvent.pointerLeave(tunis, { pointerType: 'touch' });
    expect(within(screen.getByRole('status')).getByText('Tunisie')).toBeInTheDocument();
    fireEvent.pointerLeave(tunis, { pointerType: 'mouse' });
    expect(within(screen.getByRole('status')).queryByText('Tunisie')).toBeNull();
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

  it('an article leads to the next news item, and the last one back to the first', () => {
    const items = pressItems();
    items.forEach((item, index) => {
      const next = items[(index + 1) % items.length];
      const { unmount } = renderIn('fr', <PressArticle slug={item.slug} />);
      expect(screen.getByRole('link', { name: /Article suivant/ })).toHaveAttribute(
        'href',
        expect.stringMatching(new RegExp(`^/fr/actualites/${next.slug}/?$`)),
      );
      unmount();
    });
  });

  it('an article shows its texts in the page language and links back to all news', () => {
    const item = PRESS_ITEMS[0];
    renderIn('ar', <PressArticle slug={item.slug} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(item.text.ar.title);
    expect(screen.getByText(item.text.ar.intro)).toBeInTheDocument();
    for (const section of item.text.ar.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeInTheDocument();
      expect(screen.getByText(section.text)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'كل الأخبار' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/ar\/actualites\/?$/),
    );
  });

  it('the news page title shows ® small and raised, not bold', () => {
    renderIn('fr', <PressList />);
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('Matchy+® press');
    const mark = title.querySelector('sup');
    expect(mark).toHaveTextContent('®');
    expect(mark).toHaveClass('font-normal');
  });

  it('a news card has no dot before the place and no line above Matchy+', () => {
    const { container } = renderIn('fr', <Press />);
    expect(container.querySelector('.h-1\\.5.w-1\\.5.rounded-full')).toBeNull();
    expect(container.querySelector('.border-t')).toBeNull();
  });

  it('a news card shows its title once (not on the cover too)', () => {
    renderIn('fr', <Press />);
    for (const item of pressItems().slice(0, 3)) {
      expect(screen.getAllByText(item.text.fr.title)).toHaveLength(1);
    }
  });

  it('the Al Wataniya 1 and Express FM articles play their replay', () => {
    for (const [slug, id] of [
      ['matchy-plus-al-wataniya-1-jil-al-mostakbal', 'lsoz7VXc5ok'],
      ['matchy-plus-express-fm-mundo-design', 'MPJXj0HWO7A'],
    ]) {
      const { container, unmount } = renderIn('fr', <PressArticle slug={slug} />);
      expect(container.querySelector('iframe')).toHaveAttribute(
        'src',
        `https://www.youtube-nocookie.com/embed/${id}`,
      );
      unmount();
    }
  });

  it('an article ends with the way back and the next article, without source buttons', () => {
    const item = PRESS_ITEMS.find((entry) => entry.linkedin || entry.website) ?? PRESS_ITEMS[0];
    renderIn('fr', <PressArticle slug={item.slug} />);
    expect(screen.queryByText('Et vous, que cherchez-vous ?')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Proposer une collaboration' })).toBeNull();
    expect(screen.queryByRole('link', { name: /LinkedIn|site officiel/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Toutes les actualités/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Article suivant/ })).toBeInTheDocument();
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
    expect(
      screen.getByRole('heading', { level: 2, name: 'Nos partenaires et écosystèmes' }),
    ).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    // DOT-IT and TCA (GoPayzi was removed)
    expect(links.map((link) => link.getAttribute('href'))).toEqual(PARTNERS.map((p) => p.url));
    expect(screen.queryByRole('img', { name: /GoPayzi/ })).toBeNull();
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
