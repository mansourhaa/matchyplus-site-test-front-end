import { I18nProvider } from '@/features/i18n/i18n-provider';
import type { OnboardingProfile } from '@/features/onboarding/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationStep } from './location-step';

function renderStep(ui: ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

function firstButton(name: string | RegExp) {
  return screen.getAllByRole('button', { name })[0];
}

function firstPlaceholder(text: string) {
  return screen.getAllByPlaceholderText(text)[0];
}

const baseProfile: OnboardingProfile = {
  id: 'user-1',
  name: 'Jane Doe',
  auth_provider: 'phone',
  job: 'Électricien',
  bio: null,
  image: null,
  video: null,
  city: null,
  profile_type: 'INDIVIDUAL',
  offer_service: false,
  service_type: null,
  price: null,
  interests: ['Bricolage'],
  selected_goals: ['Trouver un job'],
  availability_days: [],
  availability_hours: [],
  contact_modes: [],
  languages: [],
  onboardingCompleted: false,
};

describe('LocationStep', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hydrates resumed progress once the profile fetch resolves after mount', async () => {
    const { rerender } = renderStep(
      <LocationStep
        profile={null}
        stepNumber={3}
        totalSteps={3}
        loading={false}
        onFinish={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(firstPlaceholder('Votre ville (ex : Tunis, Sousse...)')).toHaveValue('');
    });

    rerender(
      <I18nProvider>
        <LocationStep
          profile={{ ...baseProfile, city: 'Tunis' }}
          stepNumber={3}
          totalSteps={3}
          loading={false}
          onFinish={vi.fn()}
          onBack={vi.fn()}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(firstPlaceholder('Votre ville (ex : Tunis, Sousse...)')).toHaveValue('Tunis');
    });
  });

  it('does not show availability chips or require them when not offering a service', async () => {
    const onFinish = vi.fn().mockResolvedValue(true);
    renderStep(
      <LocationStep
        profile={baseProfile}
        stepNumber={3}
        totalSteps={3}
        loading={false}
        onFinish={onFinish}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryByText('Mes disponibilités')).not.toBeInTheDocument();
    fireEvent.click(firstButton(/Lancer Matchy\+/));

    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ availabilityDays: [], availabilityHours: [] }),
    );
  });

  it('requires at least one availability day when offering a service', async () => {
    const onFinish = vi.fn().mockResolvedValue(true);
    renderStep(
      <LocationStep
        profile={{ ...baseProfile, offer_service: true }}
        stepNumber={3}
        totalSteps={3}
        loading={false}
        onFinish={onFinish}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(firstButton(/Lancer Matchy\+/));

    expect(onFinish).not.toHaveBeenCalled();
    expect(await screen.findAllByText('Sélectionnez au moins un jour.')).not.toHaveLength(0);
  });

  it('finishes once a day is selected when offering a service', async () => {
    const onFinish = vi.fn().mockResolvedValue(true);
    renderStep(
      <LocationStep
        profile={{ ...baseProfile, offer_service: true }}
        stepNumber={3}
        totalSteps={3}
        loading={false}
        onFinish={onFinish}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(firstButton('Lun'));
    fireEvent.click(firstButton(/Lancer Matchy\+/));

    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ availabilityDays: ['Lun'] }));
  });

  it('auto-detects GPS and fills the city on success', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 36.8065,
          longitude: 10.1815,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition, watchPosition: vi.fn(), clearWatch: vi.fn() },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: { city: 'Tunis' } }),
      }),
    );

    renderStep(
      <LocationStep
        profile={baseProfile}
        stepNumber={3}
        totalSteps={3}
        loading={false}
        onFinish={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Position détectée ✓')[0]).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByText('Tunis')[0]).toBeInTheDocument();
    });
  });
});
