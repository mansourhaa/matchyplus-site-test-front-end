import { I18nProvider } from '@/features/i18n/i18n-provider';
import { LOCALE_STORAGE_KEY } from '@/features/i18n/messages';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SEARCH_FILTERS,
  SearchFilters,
  SearchFiltersSheet,
  countActiveSearchFilters,
} from './search-filters-sheet';

describe('SearchFiltersSheet', () => {
  beforeEach(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'fr');
  });

  it('renders all filter sections properly matching the design in French', () => {
    const draft: SearchFilters = { ...DEFAULT_SEARCH_FILTERS };
    const onChange = vi.fn();
    const onClose = vi.fn();
    const onApply = vi.fn();
    const onReset = vi.fn();

    render(
      <I18nProvider>
        <SearchFiltersSheet
          open={true}
          draft={draft}
          onChange={onChange}
          onClose={onClose}
          onApply={onApply}
          onReset={onReset}
        />
      </I18nProvider>,
    );

    expect(screen.getByText('Filtres personnalisés')).toBeInTheDocument();
    expect(screen.getByText('Secteurs')).toBeInTheDocument();
    expect(screen.getByText('Distance maximale')).toBeInTheDocument();
    expect(screen.getByText('Note minimale')).toBeInTheDocument();
    expect(screen.getByText('Prix / jour')).toBeInTheDocument();
    expect(screen.getByText('Disponibles uniquement')).toBeInTheDocument();
    expect(screen.getByText('Trier par')).toBeInTheDocument();
    expect(screen.getByText('Appliquer les filtres')).toBeInTheDocument();
  });

  it('handles sector changes and reset', () => {
    const draft: SearchFilters = { ...DEFAULT_SEARCH_FILTERS };
    const onChange = vi.fn();
    const onClose = vi.fn();
    const onApply = vi.fn();
    const onReset = vi.fn();

    render(
      <I18nProvider>
        <SearchFiltersSheet
          open={true}
          draft={draft}
          onChange={onChange}
          onClose={onClose}
          onApply={onApply}
          onReset={onReset}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Services & missions' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sector: 'Services & missions' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(onReset).toHaveBeenCalled();
  });

  it('handles sorting options and availability toggle', () => {
    const draft: SearchFilters = { ...DEFAULT_SEARCH_FILTERS };
    const onChange = vi.fn();

    render(
      <I18nProvider>
        <SearchFiltersSheet
          open={true}
          draft={draft}
          onChange={onChange}
          onClose={vi.fn()}
          onApply={vi.fn()}
          onReset={vi.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '⭐ Note' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sort: 'rating' }));

    fireEvent.click(screen.getByRole('button', { name: '💰 Prix ↑' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sort: 'price_asc' }));

    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ availableOnly: true }));
  });

  it('counts active search filters correctly', () => {
    expect(countActiveSearchFilters(DEFAULT_SEARCH_FILTERS)).toBe(0);

    expect(
      countActiveSearchFilters({
        ...DEFAULT_SEARCH_FILTERS,
        sector: 'Services & missions',
      }),
    ).toBe(1);

    expect(
      countActiveSearchFilters({
        ...DEFAULT_SEARCH_FILTERS,
        sector: 'Services & missions',
        minRating: 4,
        minPrice: 20,
        maxPrice: 80,
        availableOnly: true,
        sort: 'rating',
      }),
    ).toBe(5);
  });
});
