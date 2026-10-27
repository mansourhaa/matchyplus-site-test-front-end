import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DistanceFilterBar } from './distance-filter-bar';

describe('DistanceFilterBar', () => {
  it('renders all presets in the exact expected order: Tout, 5 km, 10 km, 25 km, 50 km, 100 km, 250 km', () => {
    const onSelect = vi.fn();
    render(<DistanceFilterBar distanceRadius={null} onSelectRadius={onSelect} />);

    const chips = screen.getAllByRole('tab');
    expect(chips).toHaveLength(7);
    expect(chips[0]).toHaveTextContent('Tout');
    expect(chips[1]).toHaveTextContent('5 km');
    expect(chips[2]).toHaveTextContent('10 km');
    expect(chips[3]).toHaveTextContent('25 km');
    expect(chips[4]).toHaveTextContent('50 km');
    expect(chips[5]).toHaveTextContent('100 km');
    expect(chips[6]).toHaveTextContent('250 km');
  });

  it('selects Tout when distanceRadius is null', () => {
    render(<DistanceFilterBar distanceRadius={null} onSelectRadius={vi.fn()} />);

    expect(screen.getByTestId('distance-chip-all')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('distance-chip-5')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('distance-chip-10')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('distance-chip-25')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('distance-chip-50')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('distance-chip-100')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('distance-chip-250')).toHaveAttribute('aria-selected', 'false');
  });

  it('selects 10 km when distanceRadius is 10', () => {
    render(<DistanceFilterBar distanceRadius={10} onSelectRadius={vi.fn()} />);

    expect(screen.getByTestId('distance-chip-all')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('distance-chip-10')).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onSelectRadius when clicking a preset chip', () => {
    const onSelect = vi.fn();
    render(<DistanceFilterBar distanceRadius={null} onSelectRadius={onSelect} />);

    fireEvent.click(screen.getByTestId('distance-chip-25'));
    expect(onSelect).toHaveBeenCalledWith(25, { immediate: true });

    fireEvent.click(screen.getByTestId('distance-chip-all'));
    expect(onSelect).toHaveBeenCalledWith(null, { immediate: true });
  });

  it('updates slider value and calls onSelectRadius after debounce when slider moves', async () => {
    const onSelect = vi.fn();
    render(<DistanceFilterBar distanceRadius={null} onSelectRadius={onSelect} debounceMs={50} />);

    fireEvent.click(screen.getByTestId('distance-custom-toggle'));

    const slider = screen.getByTestId('distance-slider-input');
    fireEvent.change(slider, { target: { value: '20' } });

    expect(screen.getByTestId('distance-slider-value')).toHaveTextContent('20 km');
    expect(onSelect).toHaveBeenCalledWith(20, { immediate: false });

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(20, { immediate: true });
    });
  });

  it('clicking Réinitialiser restores default Tout and resets slider to 250 km', () => {
    const onSelect = vi.fn();
    render(<DistanceFilterBar distanceRadius={25} onSelectRadius={onSelect} />);

    fireEvent.click(screen.getByTestId('distance-custom-toggle'));
    fireEvent.click(screen.getByTestId('distance-reset-btn'));

    expect(onSelect).toHaveBeenCalledWith(null, { immediate: true });
    expect(screen.getByTestId('distance-slider-value')).toHaveTextContent('250 km');
  });

  it('closes popover on pressing Escape key', () => {
    render(<DistanceFilterBar distanceRadius={null} onSelectRadius={vi.fn()} />);

    fireEvent.click(screen.getByTestId('distance-custom-toggle'));
    expect(screen.getByTestId('distance-custom-popover')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('distance-custom-popover')).toBeNull();
  });

  it('closes popover on clicking outside', () => {
    render(
      <div>
        <div data-testid="outside-element">Outside</div>
        <DistanceFilterBar distanceRadius={null} onSelectRadius={vi.fn()} />
      </div>,
    );

    fireEvent.click(screen.getByTestId('distance-custom-toggle'));
    expect(screen.getByTestId('distance-custom-popover')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside-element'));
    expect(screen.queryByTestId('distance-custom-popover')).toBeNull();
  });
});
