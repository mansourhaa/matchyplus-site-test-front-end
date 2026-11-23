// @vitest-environment jsdom
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Footer } from './site-shell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/fr/',
}));

/** The footer columns of the content brief, each with its links, in order. */
const COLUMNS = {
  'Trouver un service': [
    'Trouver un professionnel',
    'Services à domicile',
    'Artisans et travaux',
    'Transport et livraison',
    'Garde d’enfants',
    'Services aux entreprises',
    'Tous les services',
  ],
  'Pour les professionnels': [
    'Créer mon profil',
    'Développer ma visibilité',
    'Trouver des opportunités',
    'Fonctionnement',
    'Centre d’aide',
    'Se connecter',
  ],
  'Matchy+': [
    'À propos',
    'Actualités',
    'Partenaires',
    'Offre entreprise',
    'Nous contacter',
    'Rejoindre Matchy+',
  ],
  'Informations légales': [
    'Conditions générales d’utilisation',
    'Politique de confidentialité',
    'Signaler un contenu',
  ],
};

describe('Footer', () => {
  it('has the 4 columns of the content brief, every link in order', () => {
    render(
      <I18nProvider locale="fr">
        <Footer />
      </I18nProvider>,
    );
    for (const [title, labels] of Object.entries(COLUMNS)) {
      const column = screen.getByRole('navigation', { name: title });
      expect(
        within(column)
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual(labels);
    }
    // the cookie settings are a button (it opens the CookieYes preferences, not a page)
    expect(screen.getByRole('button', { name: 'Gestion des cookies' })).toHaveClass(
      'cky-banner-element',
    );
  });

  it('links each item to a page that exists, or to the app', () => {
    render(
      <I18nProvider locale="fr">
        <Footer />
      </I18nProvider>,
    );
    const href = (name: string) => screen.getByRole('link', { name }).getAttribute('href');
    expect(href('Trouver un professionnel')).toMatch(/^\/fr\/recherche\/?$/);
    expect(href('Garde d’enfants')).toMatch(
      /^\/fr\/recherche\/?\?service=Garde\+d%E2%80%99enfants$/,
    );
    expect(href('Tous les services')).toMatch(/^\/fr\/services\/?$/);
    expect(href('Centre d’aide')).toMatch(/^\/fr\/faq\/?$/);
    expect(href('Se connecter')).toMatch(/\/connexion$/);
    expect(href('Créer mon profil')).toMatch(/\/register$/);
    expect(href('Partenaires')).toMatch(/^\/fr\/partenaires\/?$/);
    expect(href('Offre entreprise')).toMatch(/^\/fr\/devenir-partenaire\/?$/);
    expect(href('Conditions générales d’utilisation')).toMatch(/^\/fr\/terms-of-service\/?$/);
    expect(href('Signaler un contenu')).toMatch(/^\/fr\/contact\/?$/);
  });

  it('is translated in English and Arabic', () => {
    for (const [locale, title] of [
      ['en', 'Find a service'],
      ['ar', 'ابحث عن خدمة'],
    ] as const) {
      const { unmount } = render(
        <I18nProvider locale={locale}>
          <Footer />
        </I18nProvider>,
      );
      expect(screen.getByRole('navigation', { name: title })).toBeInTheDocument();
      unmount();
    }
  });
});
