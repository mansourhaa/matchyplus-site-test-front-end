// @vitest-environment jsdom
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Footer, Header } from './site-shell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/fr/',
}));

/** The footer columns, each with its links, in order. */
const COLUMNS = {
  'Pour les professionnels': [
    'Créer mon profil',
    'Fonctionnement',
    'Centre d’aide',
    'Tous les services',
    'Se connecter',
    'Devenir partenaire',
  ],
  'Matchy+': [
    'À propos de nous',
    'Actualités & Média',
    'Développer ma visibilité',
    'Télécharger l’application(Soon)',
  ],
  'Informations légales': [
    'Politique de confidentialité',
    'Conditions d’utilisation',
    'Nous contacter',
    '+216 94 670 292',
    'Contact@matchyplus.com',
  ],
};

describe('Header', () => {
  it('has "S\u2019inscrire gratuitement" then "Connexion", both to the app, and a flag-only language picker', () => {
    render(
      <I18nProvider locale="fr">
        <Header />
      </I18nProvider>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const login = within(nav).getByRole('link', { name: /Connexion/ });
    const signUp = within(nav).getByRole('link', { name: /inscrire gratuitement/ });
    expect(login).toHaveAttribute('href', expect.stringMatching(/\/connexion$/));
    // right after the sign-up button
    expect(signUp.nextElementSibling).toBe(login);
    // the language picker shows the flag only (its name is for screen readers)
    const picker = within(nav).getByRole('button', { name: 'Français' });
    expect(picker).not.toHaveTextContent('FR');
  });
});

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
    // "Trouver un service" was removed by the manager
    expect(screen.queryByRole('navigation', { name: 'Trouver un service' })).toBeNull();
  });

  it('the last column ends with the phone and the email, as on the contact page', () => {
    render(
      <I18nProvider locale="fr">
        <Footer />
      </I18nProvider>,
    );
    expect(screen.getByRole('link', { name: '+216 94 670 292' })).toHaveAttribute(
      'href',
      'tel:+21694670292',
    );
    expect(screen.getByRole('link', { name: 'Contact@matchyplus.com' })).toHaveAttribute(
      'href',
      'mailto:Contact@matchyplus.com',
    );
    // as in the manager's picture: no cookies link and no partners link in the footer
    expect(screen.queryByRole('link', { name: 'Gérer les cookies' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Nos partenaires' })).toBeNull();
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
    expect(href('Tous les services', pros)).toMatch(/^\/fr\/services\/?$/);
    expect(href('Se connecter', pros)).toMatch(/\/connexion$/);
    expect(href('Devenir partenaire', pros)).toMatch(/^\/fr\/devenir-partenaire\/?$/);
    expect(href('Développer ma visibilité', 'Matchy+')).toMatch(/^\/fr\/partenaires\/?$/);
    expect(href('Télécharger l’application(Soon)', 'Matchy+')).toMatch(
      /^\/fr\/utilisation\/?#download$/,
    );
    expect(href('Nous contacter', 'Informations légales')).toMatch(/^\/fr\/contact\/?$/);
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
