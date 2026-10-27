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
    expect(screen.getByText("Centres d'intérêt")).toBeInTheDocument();
    expect(screen.getByText('Distance maximale')).toBeInTheDocument();
    expect(screen.getByText('Note minimale')).toBeInTheDocument();
    expect(screen.getByText('Prix / jour')).toBeInTheDocument();
    expect(screen.getByText('Disponibles uniquement')).toBeInTheDocument();
    expect(screen.getByText('Trier par')).toBeInTheDocument();
    expect(screen.getByText('Appliquer les filtres')).toBeInTheDocument();
  });

  it('renders sectors and interests properly localized in Arabic', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
    const draft: SearchFilters = { ...DEFAULT_SEARCH_FILTERS };

    render(
      <I18nProvider>
        <SearchFiltersSheet
          open={true}
          draft={draft}
          onChange={vi.fn()}
          onClose={vi.fn()}
          onApply={vi.fn()}
          onReset={vi.fn()}
        />
      </I18nProvider>,
    );

    // Section headers
    expect(screen.getByText('القطاعات')).toBeInTheDocument();
    expect(screen.getByText('الاهتمامات')).toBeInTheDocument();

    // Localized sector pills in Arabic
    expect(screen.getByRole('button', { name: 'معلوماتية / تكنولوجيا' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'خدمة منزلية' })).toBeInTheDocument();

    // Localized interest pills in Arabic
    expect(screen.getByRole('button', { name: 'أشغال يدوية' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'سباكة' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'طبخ' })).toBeInTheDocument();
  });

  it('handles multi-select sector changes and reset', () => {
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
      expect.objectContaining({
        sectors: ['Services & missions'],
        sector: 'Services & missions',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(onReset).toHaveBeenCalled();
  });

  it('handles multi-select interest changes and toggle', () => {
    const draft: SearchFilters = {
      ...DEFAULT_SEARCH_FILTERS,
      interests: ['Bricolage'],
    };
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

    // Clicking an unselected interest adds it
    fireEvent.click(screen.getByRole('button', { name: 'Jardinage' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ interests: ['Bricolage', 'Jardinage'] }),
    );

    // Clicking an already selected interest removes it
    fireEvent.click(screen.getByRole('button', { name: 'Bricolage' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ interests: [] }));
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

  it('adjusts distance slider up to 250 km', () => {
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

    const distanceSlider = screen.getByTestId('search-filter-distance-slider');
    expect(distanceSlider).toHaveAttribute('max', '250');
    fireEvent.change(distanceSlider, { target: { value: '180' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ maxDistanceKm: 180 }));
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
        sectors: ['Services & missions', 'Informatique / Tech'],
        interests: ['Bricolage', 'Jardinage'],
      }),
    ).toBe(2);

    expect(
      countActiveSearchFilters({
        ...DEFAULT_SEARCH_FILTERS,
        sectors: ['Services & missions'],
        interests: ['Bricolage'],
        minRating: 4,
        minPrice: 20,
        maxPrice: 80,
        availableOnly: true,
        sort: 'rating',
      }),
    ).toBe(6);
  });
});
