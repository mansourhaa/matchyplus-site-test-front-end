import { I18nProvider } from '@/features/i18n/i18n-provider';
import type { OnboardingProfile } from '@/features/onboarding/types';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InterestsStep } from './interests-step';

function renderStep(ui: ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

// OnboardingStepLayout renders children twice (a desktop and a mobile copy — CSS media
// queries don't apply in jsdom), so every query needs the "first match" treatment, same
// as the existing identity-step/location-step test helpers.
function firstButton(name: string | RegExp) {
  return screen.getAllByRole('button', { name })[0];
}

function continueButton() {
  // Interests can be mid-flow ("Continuer") or last ("Lancer Matchy+") depending on
  // the wizard's totalSteps — tests exercise both labels via this helper.
  return firstButton(/^(Continuer|Lancer Matchy\+)$/);
}

function selectServiceType(type: string) {
  fireEvent.click(firstButton(/Choisir un type de service|Chauffeur \/ Transport/));
  fireEvent.click(firstButton(type));
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
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  afterEach(() => {
    window.localStorage.removeItem('matchy_locale');
  });
  it('blocks submission and shows an error when there are no interests', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderStep(
      <InterestsStep
        profile={baseProfile}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(continueButton());

    expect(onNext).not.toHaveBeenCalled();
    // Regression: schemas.ts's array .min(1) must carry an explicit message, or this
    // falls back to Zod's raw technical wording ("Too small: expected array to have
    // >=1 items") leaking straight to the user instead of friendly copy.
    expect(await screen.findAllByText('Ajoutez au moins un centre d’intérêt.')).not.toHaveLength(0);
    expect(screen.queryByText(/expected array/i)).not.toBeInTheDocument();
  });

  it('blocks submission and shows an error when no goals are selected', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderStep(
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
    // A new INDIVIDUAL step starts with its default goal: remove it.
    fireEvent.click(firstButton('Trouver un emploi'));
    fireEvent.click(continueButton());

    expect(onNext).not.toHaveBeenCalled();
    expect(await screen.findAllByText('Sélectionnez au moins un objectif.')).not.toHaveLength(0);
    expect(screen.queryByText(/expected array/i)).not.toBeInTheDocument();
  });

  it('shows « Chercher un prestataire » instead of « Offrir un service » for a PROVIDER profile', () => {
    renderStep(
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
    expect(screen.getAllByText('Chercher un prestataire').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Élargissez votre cercle d’activité autour de vous.').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Budget indicatif (DT)').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Années d’expérience')).toHaveLength(0);
  });

  it('saves the service wanted and the budget of a PROVIDER profile without offering a service', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderStep(
      <InterestsStep
        profile={{ ...baseProfile, profile_type: 'PROVIDER' }}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(firstButton('+ Bricolage'));
    selectServiceType('Chauffeur / Transport');
    fireEvent.change(firstPlaceholder('Montant'), { target: { value: '40' } });
    fireEvent.click(continueButton());

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({
        offerService: false,
        serviceType: 'Chauffeur / Transport',
        price: '40',
      }),
    );
  });

  it('pre-fills the service wanted and the budget from the voice message of a PROVIDER profile', () => {
    renderStep(
      <InterestsStep
        profile={{ ...baseProfile, profile_type: 'PROVIDER' }}
        aiSuggestions={{ serviceType: 'Jardinage / Bricolage', price: '40' }}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Jardinage / Bricolage').length).toBeGreaterThan(0);
    expect(firstPlaceholder('Montant')).toHaveValue('40');
  });

  it('shows type of service and price, without experience, to someone offering a service', () => {
    renderStep(
      <InterestsStep
        profile={{ ...baseProfile, offer_service: true }}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Élargissez votre activité autour de vous.').length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText('Prix approximatif (DT)').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Années d’expérience')).toHaveLength(0);
  });

  it('requires a service type when offering a service', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderStep(
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
    fireEvent.click(continueButton());

    expect(onNext).not.toHaveBeenCalled();
    expect(
      await screen.findAllByText(
        'Le type de service est obligatoire quand l’offre de service est activée.',
      ),
    ).not.toHaveLength(0);
  });

  it('requires a price greater than 0 when offering a service', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderStep(
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
    selectServiceType('Chauffeur / Transport');
    fireEvent.click(continueButton());

    expect(onNext).not.toHaveBeenCalled();
    expect(
      await screen.findAllByText('Le prix est obligatoire et doit être supérieur à 0.'),
    ).not.toHaveLength(0);
  });

  it('submits interests and goals for an INDIVIDUAL profile not offering a service', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderStep(
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
    // New INDIVIDUAL steps default offer-service on — turn it off for this case.
    fireEvent.click(screen.getAllByRole('switch')[0]);
    fireEvent.click(continueButton());

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
    renderStep(
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
    selectServiceType('Chauffeur / Transport');
    fireEvent.change(firstPlaceholder('Montant'), { target: { value: '50' } });
    fireEvent.click(continueButton());

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
    const { rerender } = renderStep(
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
      <I18nProvider>
        <InterestsStep
          profile={{
            ...baseProfile,
            interests: ['Bricolage'],
            selected_goals: ['Trouver un job'],
          }}
          stepNumber={2}
          totalSteps={3}
          loading={false}
          onNext={vi.fn()}
          onBack={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getAllByText('Bricolage').length).toBeGreaterThan(0);
  });

  it('pre-fills an empty price from the profile video analysis', () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderStep(
      <InterestsStep
        profile={{ ...baseProfile, offer_service: true }}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
        aiSuggestions={{ price: '20' }}
      />,
    );

    fireEvent.click(firstButton('+ Bricolage'));
    selectServiceType('Chauffeur / Transport');
    fireEvent.click(continueButton());

    expect(onNext).toHaveBeenCalledWith(expect.objectContaining({ price: '20' }));
  });

  it('starts a new step with a default goal from the profile type', () => {
    const { unmount } = renderStep(
      <InterestsStep
        profile={baseProfile}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(firstButton('Trouver un emploi').textContent).toBe('Trouver un emploi');
    expect(firstButton('Trouver un emploi').style.fontWeight).toBe('700');
    unmount();

    renderStep(
      <InterestsStep
        profile={{ ...baseProfile, profile_type: 'PROVIDER' }}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(firstButton('Recruter un collaborateur').style.fontWeight).toBe('700');
    expect(firstButton('Trouver un emploi').style.fontWeight).toBe('400');
  });

  it('pre-fills interests and goals from the video, and proposes the other jobs', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderStep(
      <InterestsStep
        profile={baseProfile}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
        aiSuggestions={{
          job: 'Aide ménagère',
          interestTags: ['Ménage'],
          homeService: true,
          proposals: { job: ['Femme de ménage'] },
        }}
      />,
    );

    fireEvent.click(firstButton('+ Femme de ménage'));
    fireEvent.click(screen.getAllByRole('switch')[0]);
    fireEvent.click(continueButton());

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({
        interests: ['Aide ménagère', 'Ménage', 'Femme de ménage'],
        selectedGoals: [
          'Trouver un job',
          'Proposer mes services',
          'Travailler comme prestataire',
          'Service à domicile',
        ],
      }),
    );
  });

  it('pre-fills the service type from the video for someone offering services', () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderStep(
      <InterestsStep
        profile={baseProfile}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
        aiSuggestions={{ job: 'Aide ménagère', serviceType: 'Aide ménagère', price: '20' }}
      />,
    );

    fireEvent.click(continueButton());

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({ offerService: true, serviceType: 'Aide ménagère', price: '20' }),
    );
  });

  it('keeps the goals the person chose', () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderStep(
      <InterestsStep
        profile={{
          ...baseProfile,
          interests: ['Cuisine'],
          selected_goals: ['Trouver des missions'],
        }}
        stepNumber={2}
        totalSteps={3}
        loading={false}
        onNext={onNext}
        onBack={vi.fn()}
        aiSuggestions={{ job: 'Aide ménagère', homeService: true }}
      />,
    );
    fireEvent.click(continueButton());

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({ interests: ['Cuisine'], selectedGoals: ['Trouver des missions'] }),
    );
  });
});
