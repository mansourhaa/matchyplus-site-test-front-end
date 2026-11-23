// @vitest-environment jsdom
import { I18nProvider } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchResults } from './search-results';

const query = vi.hoisted(() => ({ value: '' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/fr/recherche/',
  useSearchParams: () => new URLSearchParams(query.value),
}));

function renderIn(locale: Locale, search: string) {
  query.value = search;
  return render(
    <I18nProvider locale={locale}>
      <SearchResults />
    </I18nProvider>,
  );
}

describe('SearchResults', () => {
  it('shows the search and a sign-up link carrying it, without an invented count', () => {
    renderIn('fr', 'service=Plombier&ville=Sfax');
    expect(
      screen.getByRole('heading', { name: 'Trouvez le bon professionnel pour votre besoin' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Plombier')).toBeInTheDocument();
    expect(screen.getByText('Sfax')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Créer mon compte gratuit/ })).toHaveAttribute(
      'href',
      'http://localhost:3000/register?service=Plombier&ville=Sfax',
    );
    // the content brief allows only sourced figures: no count until a search API exists
    expect(screen.queryByText(/\d/)).toBeNull();
  });

  it('without a city, says "near you"; the back link returns home in the same language', () => {
    renderIn('en', '');
    expect(screen.getByText('Near you')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change my search' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/en\/?$/),
    );
  });
});
