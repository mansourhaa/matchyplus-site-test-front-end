import type { OnboardingProfile } from '@/features/onboarding/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LocationStep } from './location-step';

function firstButton(name: string | RegExp) {
  return screen.getAllByRole('button', { name })[0];
}

const baseProfile: OnboardingProfile = {
  id: 'user-1',
  name: 'Jane Doe',
  job: 'Électricien',
  bio: null,
  image: null,
  city: null,
  profile_type: 'INDIVIDUAL',
  offer_service: false,
  service_type: null,
  sector: null,
  price: null,
  interests: ['Bricolage'],
  selected_goals: ['Trouver un job'],
  experience: null,
  experiences: null,
  education_level: null,
  educations: null,
  availability_days: [],
  availability_hours: [],
  contact_modes: [],
  languages: [],
  onboardingCompleted: false,
};

describe('LocationStep', () => {
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

    fireEvent.click(firstButton('Lundi'));
    fireEvent.click(firstButton('Lancer Matchy+'));

    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ availabilityDays: ['Lun'] }));
  });
});
