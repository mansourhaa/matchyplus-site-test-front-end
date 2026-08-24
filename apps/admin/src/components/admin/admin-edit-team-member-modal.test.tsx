import type { AdminTeamMember } from '@/features/admin-team/types';
import rootReducer from '@/features/auth/store/root-reducer';
import { adminApi } from '@/lib/admin-api';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminEditTeamMemberModal } from './admin-edit-team-member-modal';

const MEMBER: AdminTeamMember = {
  id: 't1',
  name: 'Sami Ben Ali',
  email: 'sami@matchyplus.tn',
  phone: null,
  role: 'SUPPORT',
  status: 'ACTIVE',
  last_login: null,
  create_at: '2026-01-01T00:00:00.000Z',
};

function renderModal(member: AdminTeamMember | null, onClose = vi.fn()) {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
  render(
    <Provider store={store}>
      <AdminEditTeamMemberModal key={member?.id ?? 'closed'} member={member} onClose={onClose} />
    </Provider>,
  );
  return { onClose };
}

describe('AdminEditTeamMemberModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when there is no member to edit', () => {
    renderModal(null);
    expect(screen.queryByText(/Modifier/)).not.toBeInTheDocument();
  });

  it('prefills the form from the given member', () => {
    renderModal(MEMBER);

    expect(screen.getByLabelText('Nom complet')).toHaveValue('Sami Ben Ali');
    expect(screen.getByLabelText('Email')).toHaveValue('sami@matchyplus.tn');
    expect(screen.getByLabelText('Téléphone (optionnel)')).toHaveValue('');
  });

  it('saves the edited fields and closes on success', async () => {
    const put = vi.spyOn(adminApi, 'put').mockResolvedValue({
      data: { user: { ...MEMBER, name: 'Sami Ben Ali Jr.' } },
    });
    const { onClose } = renderModal(MEMBER);

    fireEvent.change(screen.getByLabelText('Nom complet'), {
      target: { value: 'Sami Ben Ali Jr.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put).toHaveBeenCalledWith('/admin/users/t1', {
      name: 'Sami Ben Ali Jr.',
      email: 'sami@matchyplus.tn',
      phone: undefined,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("surfaces the server's rejection message and keeps the modal open", async () => {
    const put = vi.spyOn(adminApi, 'put').mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Cet email est déjà utilisé.' } },
    });
    const { onClose } = renderModal(MEMBER);

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Cet email est déjà utilisé.')).toBeInTheDocument();
    expect(put).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
