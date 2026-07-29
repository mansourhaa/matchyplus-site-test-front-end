import type { OnboardingProfile } from '@/features/onboarding/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LocationStep } from './location-step';

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
  it('hydrates resumed progress once the profile fetch resolves after mount', () => {
    // The wizard always mounts this step with profile={null} first — fetchOnboardingProfile
    // is async — then re-renders with the real profile once it resolves. Without hydration,
    // the city field below would stay blank forever, since useState only reads its initial
    // value on the very first render.
    const { rerender } = render(
      <LocationStep
        profile={null}
        stepNumber={3}
        totalSteps={3}
        loading={false}
        onFinish={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(firstPlaceholder('Votre ville (ex : Tunis, Sousse...)')).toHaveValue('');

    rerender(
      <LocationStep
        profile={{ ...baseProfile, city: 'Tunis' }}
        stepNumber={3}
        totalSteps={3}
        loading={false}
        onFinish={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(firstPlaceholder('Votre ville (ex : Tunis, Sousse...)')).toHaveValue('Tunis');
  });

  it('does not show availability chips or require them when not offering a service', async () => {
    const onFinish = vi.fn().mockResolvedValue(true);
    render(
      <LocationStep
        profile={baseProfile}
        stepNumber={5}
        totalSteps={5}
        loading={false}
        onFinish={onFinish}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryByText('Mes disponibilités')).not.toBeInTheDocument();
    fireEvent.click(firstButton('Lancer Matchy+'));

    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ availabilityDays: [], availabilityHours: [] }),
    );
  });

  it('requires at least one availability day when offering a service', async () => {
    const onFinish = vi.fn().mockResolvedValue(true);
    render(
      <LocationStep
        profile={{ ...baseProfile, offer_service: true }}
        stepNumber={3}
        totalSteps={3}
        loading={false}
        onFinish={onFinish}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(firstButton('Lancer Matchy+'));

    expect(onFinish).not.toHaveBeenCalled();
    expect(await screen.findAllByText('Sélectionnez au moins un jour.')).not.toHaveLength(0);
  });

  it('finishes once a day is selected when offering a service', async () => {
    const onFinish = vi.fn().mockResolvedValue(true);
    render(
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
    fireEvent.click(firstButton('Lancer Matchy+'));

    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ availabilityDays: ['Lun'] }));
  });
});
