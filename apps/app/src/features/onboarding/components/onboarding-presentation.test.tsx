import { I18nProvider } from '@/features/i18n/i18n-provider';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OnboardingPresentation } from './onboarding-presentation';

describe('OnboardingPresentation', () => {
  const onCompleteMock = vi.fn();

  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
    onCompleteMock.mockClear();
  });

  afterEach(() => {
    window.localStorage.removeItem('matchy_locale');
    vi.clearAllMocks();
  });

  function renderPresentation() {
    return render(
      <I18nProvider>
        <OnboardingPresentation onComplete={onCompleteMock} />
      </I18nProvider>,
    );
  }

  it('renders slide 1 (Matching) by default', () => {
    renderPresentation();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Matcher autour de vous');
    expect(screen.getByTestId('onboarding-intro-skip')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-intro-next')).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-intro-prev')).not.toBeInTheDocument();
  });

  it('advances through slides when clicking next and completes on slide 3', () => {
    renderPresentation();

    // Slide 1 -> 2
    fireEvent.click(screen.getByTestId('onboarding-intro-next'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Découvrez Matchy Explore');
    expect(screen.getByTestId('onboarding-intro-prev')).toBeInTheDocument();

    // Slide 2 -> 3
    fireEvent.click(screen.getByTestId('onboarding-intro-next'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Trouvez des missions taillées pour vous',
    );

    // Clicking on slide 3 completes onboarding intro
    fireEvent.click(screen.getByTestId('onboarding-intro-next'));
    expect(onCompleteMock).toHaveBeenCalledTimes(1);
  });

  it('navigates backwards when clicking previous button', () => {
    renderPresentation();

    fireEvent.click(screen.getByTestId('onboarding-intro-next'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Découvrez Matchy Explore');

    fireEvent.click(screen.getByTestId('onboarding-intro-prev'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Matcher autour de vous');
  });

  it('jumps directly to a slide when clicking a carousel dot', () => {
    renderPresentation();

    fireEvent.click(screen.getByTestId('onboarding-dot-2'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Trouvez des missions taillées pour vous',
    );
  });

  it('calls onComplete when clicking the skip button', () => {
    renderPresentation();

    fireEvent.click(screen.getByTestId('onboarding-intro-skip'));
    expect(onCompleteMock).toHaveBeenCalledTimes(1);
  });

  it('responds to keyboard arrow navigation', () => {
    renderPresentation();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Découvrez Matchy Explore');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Matcher autour de vous');
  });

  it('renders the back button to return to the landing page', () => {
    renderPresentation();

    const backButtons = screen.getAllByRole('button', { name: /retour/i });
    expect(backButtons.length).toBeGreaterThanOrEqual(1);
  });
});
