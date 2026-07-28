import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IdentityStep } from './identity-step';

function firstPlaceholder(text: string) {
  return screen.getAllByPlaceholderText(text)[0];
}

function firstButton(name: string | RegExp) {
  return screen.getAllByRole('button', { name })[0];
}

const oauthAuthState = {
  status: 'authenticated' as const,
  user: {
    id: 'user-1',
    email: 'jane@example.com',
    phone: null,
    name: null,
    auth_provider: 'google',
    email_verified: true,
    onboarding_completed: false,
  },
};

describe('IdentityStep', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('blocks submission and shows an error when profession is missing for an Employé profile', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep profile={null} stepNumber={1} totalSteps={3} loading={false} onNext={onNext} />,
      oauthAuthState,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
    expect(await screen.findAllByText('La profession est obligatoire.')).not.toHaveLength(0);
  });

  it('blocks submission and shows an error when the photo is missing for a phone-signup account, even before the profile fetch resolves', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep profile={null} stepNumber={1} totalSteps={3} loading={false} onNext={onNext} />,
      {
        status: 'authenticated',
        user: {
          id: 'user-1',
          email: null,
          phone: '+21612345678',
          name: null,
          auth_provider: 'phone',
          email_verified: false,
          onboarding_completed: false,
        },
      },
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
    expect(await screen.findAllByText('La photo de profil est obligatoire.')).not.toHaveLength(0);
  });

  it('does not require a photo for an OAuth account (no phone ever collected)', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep profile={null} stepNumber={1} totalSteps={3} loading={false} onNext={onNext} />,
      {
        status: 'authenticated',
        user: {
          id: 'user-1',
          email: 'jane@example.com',
          phone: null,
          name: null,
          auth_provider: 'google',
          email_verified: true,
          onboarding_completed: false,
        },
      },
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith({
      name: 'Jane Doe',
      job: 'Électricien',
      bio: undefined,
      image: undefined,
      profileType: 'INDIVIDUAL',
    });
  });

  it('does not require profession for an Employeur (PROVIDER) profile', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep profile={null} stepNumber={1} totalSteps={3} loading={false} onNext={onNext} />,
      oauthAuthState,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.click(firstButton('Employeur'));
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith({
      name: 'Jane Doe',
      job: undefined,
      bio: undefined,
      image: undefined,
      profileType: 'PROVIDER',
    });
  });

  it('submits prénom, nom, job, and the selected profile type', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep profile={null} stepNumber={1} totalSteps={3} loading={false} onNext={onNext} />,
      oauthAuthState,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith({
      name: 'Jane Doe',
      job: 'Électricien',
      bio: undefined,
      image: undefined,
      profileType: 'INDIVIDUAL',
    });
  });

  it('prefills prénom/nom by splitting the existing name', () => {
    renderWithAuthStore(
      <IdentityStep
        profile={{
          id: 'user-1',
          name: 'Existing Name',
          auth_provider: 'phone',
          job: 'Plombier',
          bio: null,
          image: null,
          city: null,
          profile_type: 'INDIVIDUAL',
          offer_service: false,
          service_type: null,
          price: null,
          interests: [],
          selected_goals: [],
          experience: null,
          availability_days: [],
          availability_hours: [],
          contact_modes: [],
          languages: [],
          onboardingCompleted: false,
        }}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        onNext={vi.fn()}
      />,
    );

    expect(firstPlaceholder('Votre prénom')).toHaveValue('Existing');
    expect(firstPlaceholder('Votre nom de famille')).toHaveValue('Name');
    expect(firstPlaceholder('Ingénieur, designer, chauffeur...')).toHaveValue('Plombier');
  });
});
