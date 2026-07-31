import type { OnboardingProfile } from '@/features/onboarding/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InterestsStep } from './interests-step';

// OnboardingStepLayout renders children twice (a desktop and a mobile copy — CSS media
// queries don't apply in jsdom), so every query needs the "first match" treatment, same
// as the existing identity-step/location-step test helpers.
function firstButton(name: string | RegExp) {
  return screen.getAllByRole('button', { name })[0];
}

function firstCombobox() {
  return screen.getAllByRole('combobox')[0];
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
  interests: [],
  selected_goals: [],
  availability_days: [],
  availability_hours: [],
  contact_modes: [],
  languages: [],
  onboardingCompleted: false,
};

describe('InterestsStep', () => {
  it('blocks submission and shows an error when there are no interests', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    render(
      <InterestsStep
        profile={baseProfile}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(firstButton('Trouver un job'));
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
  });

  it('blocks submission and shows an error when no goals are selected', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    render(
      <InterestsStep
        profile={baseProfile}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(firstButton('+ Bricolage'));
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
  });

  it('hides the "offer a service" card for a PROVIDER (Employeur) profile', () => {
    render(
      <InterestsStep
        profile={{ ...baseProfile, profile_type: 'PROVIDER' }}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryAllByText('Offrir un service ?')).toHaveLength(0);
  });

  it('requires a service type when offering a service', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    render(
      <InterestsStep
        profile={{ ...baseProfile, offer_service: true }}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(firstButton('+ Bricolage'));
    fireEvent.click(firstButton('Trouver un job'));
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
    expect(
      await screen.findAllByText(
        'Le type de service est obligatoire quand l’offre de service est activée.',
      ),
    ).not.toHaveLength(0);
  });

  it('requires a price greater than 0 when offering a service', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    render(
      <InterestsStep
        profile={{ ...baseProfile, offer_service: true }}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(firstButton('+ Bricolage'));
    fireEvent.click(firstButton('Trouver un job'));
    fireEvent.change(firstCombobox(), { target: { value: 'Chauffeur / Transport' } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
    expect(
      await screen.findAllByText('Le prix est obligatoire et doit être supérieur à 0.'),
    ).not.toHaveLength(0);
  });

  it('submits interests and goals for an INDIVIDUAL profile not offering a service', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    render(
      <InterestsStep
        profile={baseProfile}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(firstButton('+ Bricolage'));
    fireEvent.click(firstButton('Trouver un job'));
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith({
      interests: ['Bricolage'],
      selectedGoals: ['Trouver un job'],
      offerService: false,
      serviceType: undefined,
      price: undefined,
    });
  });

  it('submits full service details once every required field is filled', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    render(
      <InterestsStep
        profile={{ ...baseProfile, offer_service: true }}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(firstButton('+ Bricolage'));
    fireEvent.click(firstButton('Trouver un job'));
    fireEvent.change(firstCombobox(), { target: { value: 'Chauffeur / Transport' } });
    fireEvent.change(firstPlaceholder('Montant'), { target: { value: '50' } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith({
      interests: ['Bricolage'],
      selectedGoals: ['Trouver un job'],
      offerService: true,
      serviceType: 'Chauffeur / Transport',
      price: '50',
    });
  });

  it('hydrates resumed progress once the profile fetch resolves after mount', () => {
    // The wizard always mounts this step with profile={null} first — fetchOnboardingProfile
    // is async — then re-renders with the real profile once it resolves. Without hydration,
    // the resumed interest chip below would never appear, since useState only reads its
    // initial value on the very first render.
    const { rerender } = render(
      <InterestsStep
        profile={null}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryAllByText('Bricolage')).toHaveLength(0);

    rerender(
      <InterestsStep
        profile={{ ...baseProfile, interests: ['Bricolage'], selected_goals: ['Trouver un job'] }}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Bricolage').length).toBeGreaterThan(0);
  });
});
