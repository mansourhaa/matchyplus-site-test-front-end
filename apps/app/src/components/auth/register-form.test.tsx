import { api } from '@/lib/api';
import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RegisterForm } from './register-form';

const { pushMock, refreshMock, searchParamsRef } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => searchParamsRef.current,
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

const registeredUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: '+21612345678',
  auth_provider: 'phone',
  email_verified: false,
  onboarding_completed: false,
};

// AuthLayout renders both a desktop and a mobile copy of the form content, so every
// query below matches twice — always operate on the first match.
function firstPlaceholder(text: string) {
  return screen.getAllByPlaceholderText(text)[0];
}

function firstButton(name: string | RegExp) {
  return screen.getAllByRole('button', { name })[0];
}

async function findFirstPlaceholder(text: string) {
  const matches = await screen.findAllByPlaceholderText(text);
  return matches[0];
}

describe('RegisterForm — credentials step (phone + password + OTP)', () => {
  beforeEach(() => {
    searchParamsRef.current = new URLSearchParams();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not send an OTP when the password is too short', () => {
    renderWithAuthStore(<RegisterForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    const [passwordInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    expect(api.post).not.toHaveBeenCalled();
    expect(
      screen.getAllByText('Le mot de passe doit contenir au moins 6 caractères.')[0],
    ).toBeInTheDocument();
  });

  it('does not send an OTP when the passwords do not match', () => {
    renderWithAuthStore(<RegisterForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    const [passwordInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    fireEvent.change(confirmInput, { target: { value: 'different1' } });
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getAllByText('Les mots de passe ne correspondent pas.')[0]).toBeInTheDocument();
  });

  it('sends an OTP, verifies it for a signup grant, then registers via /auth/register-phone', async () => {
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
      }
      if (url === '/auth/otp/verify') {
        return {
          data: { verified: true, phone: '+21612345678', signupToken: 'valid-grant-token' },
        };
      }
      if (url === '/auth/register-phone') {
        return {
          data: { access_token: 'access-1', refresh_token: 'refresh-1', user: registeredUser },
        };
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    renderWithAuthStore(<RegisterForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    const [passwordInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    fireEvent.change(confirmInput, { target: { value: 'secret123' } });
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    expect(await findFirstPlaceholder('------')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/otp/send', { phone: '+21612345678' }),
    );

    const codeInput = await findFirstPlaceholder('------');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(firstButton('Confirmer'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/otp/verify', {
        phone: '+21612345678',
        code: '123456',
      }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/register-phone', {
        phone: '+21612345678',
        password: 'secret123',
        signupToken: 'valid-grant-token',
      }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/onboarding'));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('shows an error and does not register when the OTP code is rejected', async () => {
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
      }
      throw new Error('invalid_otp');
    });

    renderWithAuthStore(<RegisterForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    const [passwordInput, confirmInput] = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    fireEvent.change(confirmInput, { target: { value: 'secret123' } });
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    const codeInput = await findFirstPlaceholder('------');
    fireEvent.change(codeInput, { target: { value: '000000' } });
    fireEvent.click(firstButton('Confirmer'));

    await screen.findAllByText('Code incorrect.');
    expect(api.post).not.toHaveBeenCalledWith('/auth/register-phone', expect.anything());
    expect(pushMock).not.toHaveBeenCalled();
  });
});
