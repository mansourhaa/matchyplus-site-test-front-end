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
  name: 'Jane Doe',
  auth_provider: 'phone',
  email_verified: false,
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

describe('RegisterForm — OTP-gated registration', () => {
  beforeEach(() => {
    searchParamsRef.current = new URLSearchParams();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not allow account creation before a code has been sent and entered', () => {
    renderWithAuthStore(<RegisterForm />);

    expect(screen.queryByPlaceholderText('123456')).not.toBeInTheDocument();
    expect(firstButton('Envoyer le code')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer un compte' })).not.toBeInTheDocument();
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
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Jane Doe' } });
    fireEvent.change(firstPlaceholder('Au moins 6 caractères'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Envoyer le code'));

    const codeInput = await findFirstPlaceholder('123456');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(firstButton('Créer un compte'));

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
        name: 'Jane Doe',
      }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('does not submit registration when the entered code fails schema validation', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'sent', phone: '+21612345678' } });

    renderWithAuthStore(<RegisterForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.change(firstPlaceholder('Au moins 6 caractères'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Envoyer le code'));

    // "Créer un compte" stays disabled below the 4-character minimum, so submission is
    // blocked at the UI layer before the schema check ever runs.
    const codeInput = await findFirstPlaceholder('123456');
    fireEvent.change(codeInput, { target: { value: '12' } });

    expect(firstButton('Créer un compte')).toBeDisabled();
    expect(api.post).not.toHaveBeenCalledWith('/auth/register-phone', expect.anything());
  });
});
