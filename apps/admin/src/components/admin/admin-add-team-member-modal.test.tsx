import rootReducer from '@/features/auth/store/root-reducer';
import { adminApi } from '@/lib/admin-api';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminAddTeamMemberModal } from './admin-add-team-member-modal';

function renderModal(actorRole: 'MODERATOR' | 'SUPER_ADMIN' = 'SUPER_ADMIN', onClose = vi.fn()) {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
  render(
    <Provider store={store}>
      <AdminAddTeamMemberModal isOpen actorRole={actorRole} onClose={onClose} />
    </Provider>,
  );
  return { onClose };
}

describe('AdminAddTeamMemberModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('only offers Support to a Moderator actor', () => {
    renderModal('MODERATOR');

    const roleSelect = screen.getByLabelText('Rôle') as HTMLSelectElement;
    const options = Array.from(roleSelect.options).map((option) => option.value);
    expect(options).toEqual(['SUPPORT']);
  });

  it('offers both Support and Moderator to a Super Admin actor', () => {
    renderModal('SUPER_ADMIN');

    const roleSelect = screen.getByLabelText('Rôle') as HTMLSelectElement;
    const options = Array.from(roleSelect.options).map((option) => option.value);
    expect(options).toEqual(['SUPPORT', 'MODERATOR']);
  });

  it('blocks submission when required fields are missing', () => {
    const post = vi.spyOn(adminApi, 'post');
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Créer le compte' }));

    expect(
      screen.getByText('Le nom, l’email et le mot de passe sont obligatoires.'),
    ).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('creates the team member and closes the modal on success', async () => {
    const post = vi
      .spyOn(adminApi, 'post')
      .mockResolvedValue({ data: { member: { id: 't1', name: 'Sami Ben Ali' } } });
    const { onClose } = renderModal('SUPER_ADMIN');

    fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: 'Sami Ben Ali' } });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'sami@matchyplus.tn' },
    });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'Matchy2026!' } });
    fireEvent.change(screen.getByLabelText('Rôle'), { target: { value: 'MODERATOR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le compte' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith('/admin/team', {
      name: 'Sami Ben Ali',
      email: 'sami@matchyplus.tn',
      password: 'Matchy2026!',
      phone: undefined,
      role: 'MODERATOR',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("surfaces the server's rejection message and keeps the modal open", async () => {
    const post = vi.spyOn(adminApi, 'post').mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Cet email est déjà utilisé.' } },
    });
    const { onClose } = renderModal();

    fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: 'Sami Ben Ali' } });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'sami@matchyplus.tn' },
    });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'Matchy2026!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le compte' }));

    expect(await screen.findByText('Cet email est déjà utilisé.')).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
