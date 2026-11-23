// @vitest-environment jsdom
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Footer } from './site-shell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/fr/',
}));

/** The footer columns, each with its links, in order. */
const COLUMNS = {
  'Pour les professionnels': [
    'Créer mon profil',
    'Développer ma visibilité',
    'Fonctionnement',
    'Centre d’aide',
    'Se connecter',
    'Devenir partenaire',
  ],
  'Matchy+': [
    'À propos',
    'Actualités',
    'Télécharger l’application',
    'Nous contacter',
    'Devenir partenaire',
  ],
  'Informations légales': ['Politique de confidentialité', 'Conditions d’utilisation'],
};

describe('Footer', () => {
  it('has the 3 columns, every link in order', () => {
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
    // "Trouver un service" was removed by the manager
    expect(screen.queryByRole('navigation', { name: 'Trouver un service' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Gérer les cookies' })).toHaveClass(
      'cky-banner-element',
    );
  });

  it('links each item to a page that exists, or to the app', () => {
    render(
      <I18nProvider locale="fr">
        <Footer />
      </I18nProvider>,
    );
    const href = (name: string, column: string) =>
      within(screen.getByRole('navigation', { name: column }))
        .getByRole('link', { name })
        .getAttribute('href');
    const pros = 'Pour les professionnels';
    expect(href('Créer mon profil', pros)).toMatch(/\/register$/);
    expect(href('Centre d’aide', pros)).toMatch(/^\/fr\/faq\/?$/);
    expect(href('Se connecter', pros)).toMatch(/\/connexion$/);
    // professionals: the partner form; Matchy+: the page of our partners
    expect(href('Devenir partenaire', pros)).toMatch(/^\/fr\/devenir-partenaire\/?$/);
    expect(href('Devenir partenaire', 'Matchy+')).toMatch(/^\/fr\/partenaires\/?$/);
    expect(href('Télécharger l’application', 'Matchy+')).toMatch(/^\/fr\/utilisation\/?#download$/);
    expect(href('Conditions d’utilisation', 'Informations légales')).toMatch(
      /^\/fr\/terms-of-service\/?$/,
    );
  });

  it('is translated in English and Arabic', () => {
    for (const [locale, title] of [
      ['en', 'For professionals'],
      ['ar', 'للمهنيين'],
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
