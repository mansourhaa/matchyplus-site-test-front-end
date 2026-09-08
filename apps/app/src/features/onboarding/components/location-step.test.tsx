import { I18nProvider } from '@/features/i18n/i18n-provider';
import { LocationProvider } from '@/features/location/location-context';
import type { OnboardingProfile } from '@/features/onboarding/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationStep } from './location-step';

function renderStep(ui: ReactElement) {
  return render(
    <I18nProvider>
      <LocationProvider>{ui}</LocationProvider>
    </I18nProvider>,
  );
}

function firstButton(name: string | RegExp) {
  return screen.getAllByRole('button', { name })[0];
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
    window.localStorage.setItem('matchy_locale', 'fr');
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: vi.fn((_success, error) => {
          error?.({ code: 1, message: 'denied' });
        }),
      },
    });
  });

  afterEach(() => {
    window.localStorage.removeItem('matchy_locale');
    vi.unstubAllGlobals();
  });

  it('submits the city from a resumed profile on Continue', async () => {
    const onFinish = vi.fn().mockResolvedValue(true);
    renderStep(
      <LocationStep
        profile={{ ...baseProfile, city: 'Tunis' }}
        stepNumber={3}
        totalSteps={3}
        loading={false}
        onFinish={onFinish}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(firstButton(/Continuer/));
    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ city: 'Tunis' }));
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
    fireEvent.click(firstButton(/Continuer/));

    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith(
        expect.objectContaining({ availabilityDays: [], availabilityHours: [] }),
      );
    });
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

    fireEvent.click(firstButton(/Continuer/));

    expect(onFinish).not.toHaveBeenCalled();
    expect(await screen.findAllByText('Sélectionnez au moins un jour.')).not.toHaveLength(0);
  });

  it('continues once a day is selected when offering a service', async () => {
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
    fireEvent.click(firstButton(/Continuer/));

    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ availabilityDays: ['Lun'] }));
    });
  });

  it('does not trigger browser geolocation popup before or on the welcome page', async () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition },
    });

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

    fireEvent.click(firstButton(/Continuer/));
    await waitFor(() => expect(onFinish).toHaveBeenCalled());
    // Must NOT invoke browser geolocation prompt when submitting location step towards welcome
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
