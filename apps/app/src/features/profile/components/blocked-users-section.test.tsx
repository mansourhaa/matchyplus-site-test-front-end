import { I18nProvider } from '@/features/i18n/i18n-provider';
import profileReducer from '@/features/profile/store/profile-slice';
import type { BlockedUser } from '@/features/profile/types';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockedUsersSection } from './blocked-users-section';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockBlockedList: BlockedUser[] = [
  {
    id: 'user-blocked-1',
    name: 'Blocked Person',
    image: null,
    job: 'Developer',
    city: 'Tunis',
    activity_sector: 'Tech',
    service_type: 'Frontend',
    blocked_at: '2026-08-23T10:00:00Z',
  },
];

function renderComponent() {
  const store = configureStore({
    reducer: {
      profile: profileReducer,
    },
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <BlockedUsersSection />
      </I18nProvider>
    </Provider>,
  );
}

describe('BlockedUsersSection', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no users are blocked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });
    renderComponent();

    expect(await screen.findByText('Utilisateurs bloqués')).toBeInTheDocument();
    expect(await screen.findByText('Vous n’avez bloqué aucun utilisateur.')).toBeInTheDocument();
  });

  it('renders blocked users list and unblocks user on confirmation', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockBlockedList });
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { blocked: false } });

    renderComponent();

    expect(await screen.findByText('Blocked Person')).toBeInTheDocument();
    const unblockBtn = screen.getByRole('button', { name: 'Débloquer' });
    expect(unblockBtn).toBeInTheDocument();

    fireEvent.click(unblockBtn);

    expect(screen.getByText('Débloquer Blocked Person ?')).toBeInTheDocument();

    // Confirm unblock in modal
    const confirmBtn = screen.getAllByRole('button', { name: 'Débloquer' })[1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/profiles/user-blocked-1/block');
      expect(screen.queryByText('Blocked Person')).not.toBeInTheDocument();
    });
  });
});
