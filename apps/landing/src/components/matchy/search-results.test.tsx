// @vitest-environment jsdom
import { I18nProvider } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

/** The API answers 35 for any recognised search (apps/api ProsService). */
function apiAnswers(count: number) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response(JSON.stringify({ count })));
}

describe('SearchResults', () => {
  beforeEach(() => {
    apiAnswers(35);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a results page: the big number and its sentence as the title, the corrected search in the bar', async () => {
    renderIn('fr', 'service=pombire&ville=souse');
    await screen.findByTestId('results-count');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '35plombiers disponibles à Sousse',
    );
    expect(screen.getByLabelText('Quel service ?')).toHaveValue('Plombier');
    expect(screen.getByLabelText('Où ?')).toHaveValue('Sousse');
    // one big sign-up button, no locked cards
    expect(screen.getAllByRole('link', { name: /Continuer/ })).toHaveLength(1);
    expect(screen.queryByTestId('locked-cards')).toBeNull();
    expect(
      screen.getByText(
        'Les profils professionnels, particuliers et sociétés à Sousse sont connectés directement à l’application. Connectez-vous sans attendre qu’une offre soit publiée.',
      ),
    ).toBeInTheDocument();
  });

  it('no city typed: the same line without a city', () => {
    renderIn('fr', 'service=Plombier');
    expect(
      screen.getByText(
        'Les profils professionnels, particuliers et sociétés sont connectés directement à l’application. Connectez-vous sans attendre qu’une offre soit publiée.',
      ),
    ).toBeInTheDocument();
  });

  it('the sign-up links carry the corrected search to the app', () => {
    renderIn('fr', 'service=pombire&ville=souse');
    for (const link of screen.getAllByRole('link', { name: /Continuer/ })) {
      expect(link).toHaveAttribute(
        'href',
        'http://localhost:3000/register?lang=fr&service=Plombier&ville=Sousse',
      );
    }
  });

  it('shows the count in English and Arabic', async () => {
    const { unmount } = renderIn('en', 'service=Plumber&ville=Sousse');
    expect(await screen.findByTestId('results-count')).toHaveTextContent(
      '35plumbers available in Sousse',
    );
    unmount();
    renderIn('ar', 'service=سباك&ville=سوسة');
    expect(await screen.findByTestId('results-count')).toHaveTextContent('35سبّاكًا في سوسة');
  });

  it('an unknown search: the usual title, what was typed in the bar, no number', () => {
    renderIn('fr', 'service=astronaute&ville=Sousse');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Trouvez le bon professionnel pour votre besoin',
    );
    expect(screen.getByLabelText('Quel service ?')).toHaveValue('astronaute');
    expect(screen.queryByTestId('results-count')).toBeNull();
    expect(screen.getByRole('link', { name: /Continuer/ })).toBeInTheDocument();
  });

  it('one pro: the sentence is singular ("1 plombier disponible")', async () => {
    vi.restoreAllMocks();
    apiAnswers(1);
    renderIn('fr', 'service=Plombier&ville=Sousse');
    expect(await screen.findByTestId('results-count')).toHaveTextContent(
      '1plombier disponible à Sousse',
    );
  });

  it('asks the API with the corrected French names', async () => {
    renderIn('fr', 'service=pombire&ville=souse');
    await screen.findByTestId('results-count');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/v1\/pros\/count\?service=Plombier&city=Sousse$/),
    );
  });

  it('no number when the API cannot be reached or nobody matches: the usual title', async () => {
    vi.restoreAllMocks();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
    renderIn('fr', 'service=Plombier&ville=Sousse');
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Trouvez le bon professionnel pour votre besoin',
    );
    expect(screen.queryByTestId('results-count')).toBeNull();
  });

  it('no back link any more: the search bar is on the page', () => {
    renderIn('fr', 'service=Plombier&ville=Sfax');
    expect(screen.queryByRole('link', { name: 'Modifier ma recherche' })).toBeNull();
    expect(screen.getByRole('button', { name: /Rechercher/ })).toBeInTheDocument();
  });
});
