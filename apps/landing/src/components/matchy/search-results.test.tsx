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
  it('a results page: the big number and its sentence as the title, the corrected search in the bar', () => {
    renderIn('fr', 'service=pombire&ville=souse');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '35plombiers disponibles à Sousse',
    );
    expect(screen.getByLabelText('Quel service ?')).toHaveValue('Plombier');
    expect(screen.getByLabelText('Où ?')).toHaveValue('Sousse');
    // one big sign-up button, no locked cards
    expect(screen.getAllByRole('link', { name: /Créer mon compte gratuit/ })).toHaveLength(1);
    expect(screen.queryByTestId('locked-cards')).toBeNull();
  });

  it('the sign-up links carry the corrected search to the app', () => {
    renderIn('fr', 'service=pombire&ville=souse');
    for (const link of screen.getAllByRole('link', { name: /Créer mon compte gratuit/ })) {
      expect(link).toHaveAttribute(
        'href',
        'http://localhost:3000/register?service=Plombier&ville=Sousse',
      );
    }
  });

  it('shows the count in English and Arabic', () => {
    const { unmount } = renderIn('en', 'service=Plumber&ville=Sousse');
    expect(screen.getByTestId('results-count')).toHaveTextContent('35plumbers available in Sousse');
    unmount();
    renderIn('ar', 'service=سباك&ville=سوسة');
    expect(screen.getByTestId('results-count')).toHaveTextContent('35سبّاكًا في سوسة');
  });

  it('an unknown search: the usual title, what was typed in the bar, no number', () => {
    renderIn('fr', 'service=astronaute&ville=Sousse');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Trouvez le bon professionnel pour votre besoin',
    );
    expect(screen.getByLabelText('Quel service ?')).toHaveValue('astronaute');
    expect(screen.queryByTestId('results-count')).toBeNull();
    expect(screen.getByRole('link', { name: /Créer mon compte gratuit/ })).toBeInTheDocument();
  });

  it('no back link any more: the search bar is on the page', () => {
    renderIn('fr', 'service=Plombier&ville=Sfax');
    expect(screen.queryByRole('link', { name: 'Modifier ma recherche' })).toBeNull();
    expect(screen.getByRole('button', { name: /Rechercher/ })).toBeInTheDocument();
  });
});
