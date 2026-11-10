import { api } from '@/lib/api';
import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivationView } from './activation-view';

const { pushMock, replaceMock, searchParamsRef } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParamsRef.current,
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
  getApiErrorCode: (error: unknown) =>
    (error as { response?: { data?: { code?: string } } } | undefined)?.response?.data?.code,
}));

describe('ActivationView', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
    searchParamsRef.current = new URLSearchParams();
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('shows an error state when no token is present in the URL', async () => {
    renderWithAuthStore(<ActivationView />);

    expect(
      await screen.findByText(/Aucun jeton d’activation trouvé/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Retour à la connexion')).toBeInTheDocument();
  });

  it('shows an error when the token is invalid or expired', async () => {
    searchParamsRef.current = new URLSearchParams('token=expired-token-123');
    vi.mocked(api.get).mockRejectedValueOnce({
      response: { data: { code: 'invalid_activation_token' } },
    });

    renderWithAuthStore(<ActivationView />);

    expect(
      await screen.findByText(/Ce lien d’activation est invalide ou a expiré/i),
    ).toBeInTheDocument();
  });

  it('loads and displays preview profile information', async () => {
    searchParamsRef.current = new URLSearchParams('token=valid-lead-token');
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 'u-lead-1',
        name: 'Sarra Ben Ali',
        phone: '+21620123456',
        job: 'Développeuse Web',
        city: 'Tunis',
        category: 'Informatique',
        profileType: 'INDIVIDUAL',
      },
    });

    renderWithAuthStore(<ActivationView />);

    expect(await screen.findByText('Bienvenue, Sarra Ben Ali !')).toBeInTheDocument();
    expect(screen.getByText('Développeuse Web')).toBeInTheDocument();
    expect(screen.getByText('Tunis')).toBeInTheDocument();
    expect(screen.getByText('+21620123456')).toBeInTheDocument();
  });

  it('submits valid password and completes activation', async () => {
    searchParamsRef.current = new URLSearchParams('token=valid-lead-token');
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 'u-lead-1',
        name: 'Sarra Ben Ali',
        phone: '+21620123456',
        job: 'Développeuse Web',
        city: 'Tunis',
        category: 'Informatique',
        profileType: 'INDIVIDUAL',
      },
    });

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        user: {
          id: 'u-lead-1',
          name: 'Sarra Ben Ali',
          phone: '+21620123456',
          onboarding_completed: true,
        },
      },
    });

    renderWithAuthStore(<ActivationView />);

    await screen.findByText('Bienvenue, Sarra Ben Ali !');

    const passwordInput = screen.getByPlaceholderText('Créez un mot de passe sécurisé');
    const confirmInput = screen.getByPlaceholderText('Répétez votre mot de passe');

    fireEvent.change(passwordInput, { target: { value: 'Secret2026!' } });
    fireEvent.change(confirmInput, { target: { value: 'Secret2026!' } });

    const submitBtn = screen.getByRole('button', { name: 'Activer mon compte et continuer' });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/activation/confirm', {
        token: 'valid-lead-token',
        password: 'Secret2026!',
      });
    });

    expect(await screen.findByText('Compte activé avec succès !')).toBeInTheDocument();
  });
});
