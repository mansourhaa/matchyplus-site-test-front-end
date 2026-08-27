import authReducer from '@/features/auth/store/auth-slice';
import type { AuthState, AuthUser } from '@/features/auth/types';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import profileReducer from '@/features/profile/store/profile-slice';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PrivacyPage from './page';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
  };
});

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseUser: AuthUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: 'Jane Doe',
  auth_provider: 'phone',
  email_verified: false,
  verified: false,
  onboarding_completed: true,
};

function renderPrivacyPage(user: AuthUser = baseUser) {
  const authState: AuthState = {
    status: 'authenticated',
    loading: false,
    error: null,
    sessionChecked: true,
    sessionGeneration: 0,
    user,
  };
  const store = configureStore({
    reducer: { auth: authReducer, profile: profileReducer },
    preloadedState: { auth: authState },
  });
  return render(
    <Provider store={store}>
      <I18nProvider>
        <PrivacyPage />
      </I18nProvider>
    </Provider>,
  );
}

describe('PrivacyPage — delete account', () => {
  beforeEach(() => {
    // These tests assert French copy (product default for Tunisian QA).
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('shows an in-app confirmation dialog instead of the native browser confirm()', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    renderPrivacyPage();

    fireEvent.click(screen.getByRole('button', { name: /Supprimer définitivement mon compte/ }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Supprimer votre compte ?')).toBeInTheDocument();
  });

  it('dismisses the dialog on cancel without deleting the account', () => {
    renderPrivacyPage();

    fireEvent.click(screen.getByRole('button', { name: /Supprimer définitivement mon compte/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deletes the account and redirects to /login once confirmed in the dialog', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { message: 'ok' } });
    renderPrivacyPage();

    fireEvent.click(screen.getByRole('button', { name: /Supprimer définitivement mon compte/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Supprimer$/ }));

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith('/auth/account', {
        data: { confirm: true, currentPassword: undefined, otpCode: undefined, reason: undefined },
      }),
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows an error toast and keeps the account when deletion fails', async () => {
    vi.mocked(api.delete).mockRejectedValue(new Error('Network error'));
    renderPrivacyPage();

    fireEvent.click(screen.getByRole('button', { name: /Supprimer définitivement mon compte/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Supprimer$/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(pushMock).not.toHaveBeenCalled();
  });
});
