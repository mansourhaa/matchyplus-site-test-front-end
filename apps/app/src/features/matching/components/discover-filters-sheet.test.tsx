import { I18nProvider } from '@/features/i18n/i18n-provider';
import { DEFAULT_DISCOVER_FILTERS, MAX_DISTANCE_KM } from '@/features/matching/lib/distance-filter';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscoverFiltersSheet } from './discover-filters-sheet';

describe('DiscoverFiltersSheet component', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders distance section when open and does not render removed rating/sort/availability filters', () => {
    render(
      <I18nProvider>
        <DiscoverFiltersSheet
          open={true}
          filters={DEFAULT_DISCOVER_FILTERS}
          resultCount={24}
          onClose={vi.fn()}
          onChange={vi.fn()}
          onReset={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByTestId('discover-filters-sheet')).toBeInTheDocument();
    expect(screen.getByText('Rayon de distance')).toBeInTheDocument();
    expect(screen.getByTestId('discover-filter-distance-value')).toHaveTextContent(
      `${MAX_DISTANCE_KM} km`,
    );

    // Verify "All" / "Tout" chip is removed and enhanced milestones are present
    expect(screen.queryByTestId('discover-filter-distance-chip-all')).not.toBeInTheDocument();
    expect(screen.getByTestId('discover-filter-milestone-min')).toHaveTextContent('1 km');
    expect(screen.getByTestId('discover-filter-milestone-mid')).toHaveTextContent('125 km');
    expect(screen.getByTestId('discover-filter-milestone-max')).toHaveTextContent(
      `${MAX_DISTANCE_KM} km`,
    );

    // Verify rating, availability, and sort are removed
    expect(screen.queryByText('Disponible uniquement')).not.toBeInTheDocument();
    expect(screen.queryByText('Note minimale')).not.toBeInTheDocument();
    expect(screen.queryByText('Trier par')).not.toBeInTheDocument();
    expect(screen.getByTestId('discover-filters-apply-btn')).toHaveTextContent(
      'Voir 24 professionnels',
    );
  });

  it('triggers onChange when milestone button is clicked', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider>
        <DiscoverFiltersSheet
          open={true}
          filters={DEFAULT_DISCOVER_FILTERS}
          resultCount={10}
          onClose={vi.fn()}
          onChange={onChange}
          onReset={vi.fn()}
        />
      </I18nProvider>,
    );

    const milestoneMid = screen.getByTestId('discover-filter-milestone-mid');
    fireEvent.click(milestoneMid);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        distanceKm: 125,
      }),
    );
  });

  it('triggers onChange when distance slider is adjusted', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider>
        <DiscoverFiltersSheet
          open={true}
          filters={DEFAULT_DISCOVER_FILTERS}
          resultCount={10}
          onClose={vi.fn()}
          onChange={onChange}
          onReset={vi.fn()}
        />
      </I18nProvider>,
    );

    const slider = screen.getByTestId('discover-filter-distance-slider');
    expect(slider).toHaveAttribute('max', String(MAX_DISTANCE_KM));
    fireEvent.change(slider, { target: { value: '30' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        distanceKm: 30,
      }),
    );
  });

  it('triggers onChange when quick distance preset chip is clicked', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider>
        <DiscoverFiltersSheet
          open={true}
          filters={DEFAULT_DISCOVER_FILTERS}
          resultCount={10}
          onClose={vi.fn()}
          onChange={onChange}
          onReset={vi.fn()}
        />
      </I18nProvider>,
    );

    const chip50 = screen.getByTestId('discover-filter-distance-chip-50');
    fireEvent.click(chip50);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        distanceKm: 50,
      }),
    );

    const chipMax = screen.getByTestId(`discover-filter-distance-chip-${MAX_DISTANCE_KM}`);
    fireEvent.click(chipMax);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        distanceKm: MAX_DISTANCE_KM,
      }),
    );
  });

  it('triggers onReset when reset button is clicked', () => {
    const onReset = vi.fn();
    render(
      <I18nProvider>
        <DiscoverFiltersSheet
          open={true}
          filters={{
            distanceKm: 20,
          }}
          resultCount={5}
          onClose={vi.fn()}
          onChange={vi.fn()}
          onReset={onReset}
        />
      </I18nProvider>,
    );

    const resetBtn = screen.getByTestId('discover-filters-reset-btn');
    fireEvent.click(resetBtn);

    expect(onReset).toHaveBeenCalled();
  });
});
