import { api } from '@/lib/api';
import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResetPasswordForm } from './reset-password-form';

const { pushMock, replaceMock, refreshMock, searchParamsRef } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: refreshMock }),
  useSearchParams: () => searchParamsRef.current,
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
  getApiErrorCode: (error: unknown) =>
    (error as { response?: { data?: { code?: string } } } | undefined)?.response?.data?.code,
}));

function firstPlaceholder(text: string) {
  return screen.getAllByPlaceholderText(text)[0];
}

function firstButton(name: string | RegExp) {
  return screen.getAllByRole('button', { name })[0];
}

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
    searchParamsRef.current = new URLSearchParams();
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('renders step 1 with phone input and back button', () => {
    renderWithAuthStore(<ResetPasswordForm />);

    expect(screen.getAllByText('Réinitialiser le mot de passe')[0]).toBeInTheDocument();
    expect(firstPlaceholder('XX XXX XXX')).toBeInTheDocument();
    expect(firstButton('Envoyer le code')).toBeInTheDocument();
  });

  it('pre-fills phone number from searchParams if provided', () => {
    searchParamsRef.current = new URLSearchParams('country=TN&national=12345678');

    renderWithAuthStore(<ResetPasswordForm />);

    expect(firstPlaceholder('XX XXX XXX')).toHaveValue('12345678');
  });

  it('requests reset code via /auth/password-reset/request and advances to Step 2', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { message: 'reset_code_sent', phone: '+21612345678' },
    });

    renderWithAuthStore(<ResetPasswordForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Envoyer le code'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/password-reset/request', {
        phone: '+21612345678',
      });
    });

    await waitFor(() => {
      expect(firstPlaceholder('123456')).toBeInTheDocument();
    });

    fireEvent.change(firstPlaceholder('123456'), { target: { value: '654321' } });
    fireEvent.submit(firstPlaceholder('123456').closest('form')!);

    await waitFor(() => {
      expect(firstPlaceholder('Votre nouveau mot de passe')).toBeInTheDocument();
      expect(firstPlaceholder('Répétez votre nouveau mot de passe')).toBeInTheDocument();
    });
  });

  it('handles step 2 reset password confirmation with valid password policy and moves to step 3', async () => {
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/password-reset/request') {
        return { data: { message: 'reset_code_sent', phone: '+21612345678' } };
      }
      if (url === '/auth/password-reset/confirm') {
        return { data: { message: 'password_reset_successful' } };
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    renderWithAuthStore(<ResetPasswordForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Envoyer le code'));

    await waitFor(() => {
      expect(firstPlaceholder('123456')).toBeInTheDocument();
    });

    fireEvent.change(firstPlaceholder('123456'), { target: { value: '654321' } });
    fireEvent.submit(firstPlaceholder('123456').closest('form')!);

    await waitFor(() => {
      expect(firstPlaceholder('Votre nouveau mot de passe')).toBeInTheDocument();
    });

    fireEvent.change(firstPlaceholder('Votre nouveau mot de passe'), {
      target: { value: 'Secret123!' },
    });
    fireEvent.change(firstPlaceholder('Répétez votre nouveau mot de passe'), {
      target: { value: 'Secret123!' },
    });

    fireEvent.click(firstButton('Réinitialiser le mot de passe'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/password-reset/confirm', {
        phone: '+21612345678',
        code: '654321',
        newPassword: 'Secret123!',
      });
    });

    await waitFor(() => {
      expect(
        screen.getAllByText('Mot de passe mis à jour. Vous pouvez maintenant vous connecter.')[0],
      ).toBeInTheDocument();
    });

    // Clicking CTA navigates to login
    fireEvent.click(firstButton('Se connecter avec le nouveau mot de passe'));
    expect(pushMock).toHaveBeenCalledWith('/connexion?step=phone');
  });

  it('allows resending the code on step 2 with cooldown timer', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { message: 'reset_code_sent', phone: '+21612345678' },
    });

    renderWithAuthStore(<ResetPasswordForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Envoyer le code'));

    await waitFor(() => {
      expect(firstPlaceholder('123456')).toBeInTheDocument();
    });

    // Should be in cooldown initially in the modal
    expect(screen.getAllByText(/Renvoyer dans/)[0]).toBeInTheDocument();
  });

  it('allows going back from step 2 to step 1 to edit phone number', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { message: 'reset_code_sent', phone: '+21612345678' },
    });

    renderWithAuthStore(<ResetPasswordForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Envoyer le code'));

    await waitFor(() => {
      expect(firstPlaceholder('123456')).toBeInTheDocument();
    });

    fireEvent.change(firstPlaceholder('123456'), { target: { value: '654321' } });
    fireEvent.submit(firstPlaceholder('123456').closest('form')!);

    await waitFor(() => {
      expect(firstPlaceholder('Votre nouveau mot de passe')).toBeInTheDocument();
    });

    fireEvent.click(firstButton('Retour'));

    expect(screen.getAllByText('Réinitialiser le mot de passe')[0]).toBeInTheDocument();
    expect(firstPlaceholder('XX XXX XXX')).toBeInTheDocument();
  });
});
