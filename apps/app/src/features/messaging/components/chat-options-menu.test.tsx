import { I18nProvider } from '@/features/i18n/i18n-provider';
import matchingReducer from '@/features/matching/store/matching-slice';
import messagingReducer from '@/features/messaging/store/messaging-slice';
import type { ConversationPeer } from '@/features/messaging/types';
import profileReducer from '@/features/profile/store/profile-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatOptionsMenu } from './chat-options-menu';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

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

const mockPeer: ConversationPeer = {
  id: 'peer-1',
  name: 'Sara Ben Ali',
  image: null,
  bio: 'Développeuse Web',
  job: 'Full-Stack Developer',
  category: 'Tech',
  city: 'Tunis',
};

function renderComponent() {
  const store = configureStore({
    reducer: {
      matching: matchingReducer,
      messaging: messagingReducer,
      profile: profileReducer,
    },
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <ChatOptionsMenu peer={mockPeer} conversationId="conv-1" />
      </I18nProvider>
    </Provider>,
  );
}

describe('ChatOptionsMenu', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders menu trigger and opens dropdown with options', async () => {
    renderComponent();

    const trigger = screen.getByLabelText('Options de la conversation');
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByText('Voir le profil')).toBeInTheDocument();
    expect(screen.getByText('Annuler le match')).toBeInTheDocument();
    expect(screen.getByText('Bloquer l’utilisateur')).toBeInTheDocument();
    expect(screen.getByText('Signaler le profil')).toBeInTheDocument();
  });

  it('opens unmatch confirmation modal and unmatches peer', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
    renderComponent();

    fireEvent.click(screen.getByLabelText('Options de la conversation'));
    fireEvent.click(screen.getByText('Annuler le match'));

    expect(screen.getByText('Annuler le match avec Sara Ben Ali ?')).toBeInTheDocument();

    // Click confirm unmatch button
    const confirmBtn = screen.getAllByRole('button', { name: 'Annuler le match' })[0];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/swipe/unmatch/peer-1');
      expect(pushMock).toHaveBeenCalledWith('/matches');
    });
  });

  it('opens block confirmation modal and blocks peer', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { blocked: true } });
    renderComponent();

    fireEvent.click(screen.getByLabelText('Options de la conversation'));
    fireEvent.click(screen.getByText('Bloquer l’utilisateur'));

    expect(screen.getByText('Bloquer Sara Ben Ali ?')).toBeInTheDocument();

    // Click confirm block button
    const blockBtn = screen.getByRole('button', { name: 'Bloquer' });
    fireEvent.click(blockBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/profiles/peer-1/block');
      expect(pushMock).toHaveBeenCalledWith('/matches');
    });
  });

  it('submits report with inline block option and routes to matches', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { reportId: 'rep-1', status: 'PENDING', message: 'Report submitted' },
    });
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { blocked: true },
    });
    renderComponent();

    fireEvent.click(screen.getByLabelText('Options de la conversation'));
    fireEvent.click(screen.getByText('Signaler le profil'));

    // Check "also block" checkbox
    const alsoBlockCheckbox = screen.getByRole('checkbox');
    fireEvent.click(alsoBlockCheckbox);

    // Submit report
    const submitBtn = screen.getByRole('button', { name: 'Envoyer le signalement' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/reports/profiles/peer-1', {
        reason: 'INAPPROPRIATE',
        details: undefined,
      });
      expect(api.post).toHaveBeenCalledWith('/profiles/peer-1/block');
      expect(pushMock).toHaveBeenCalledWith('/matches');
    });
  });

  it('submits report and transitions to Facebook-style safety recommendations screen', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { reportId: 'rep-1', status: 'PENDING', message: 'Report submitted' },
    });
    renderComponent();

    fireEvent.click(screen.getByLabelText('Options de la conversation'));
    fireEvent.click(screen.getByText('Signaler le profil'));

    // Submit report
    const submitBtn = screen.getByRole('button', { name: 'Envoyer le signalement' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Signalement envoyé')).toBeInTheDocument();
      expect(screen.getByText('Actions recommandées :')).toBeInTheDocument();
      expect(screen.getByText('Bloquer Sara Ben Ali')).toBeInTheDocument();
      expect(screen.getByText('Annuler le match avec Sara Ben Ali')).toBeInTheDocument();
    });
  });
});
