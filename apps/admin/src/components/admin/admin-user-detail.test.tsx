import type { AdminManagedUser } from '@/features/admin-users/types';
import { adminApi } from '@/lib/admin-api';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminUserDetail } from './admin-user-detail';

vi.mock('@/lib/admin-api', () => ({
  adminApi: { get: vi.fn() },
}));

function buildUser(overrides: Partial<AdminManagedUser> = {}): AdminManagedUser {
  return {
    id: 'u1',
    name: 'Karim B.',
    email: 'karim.b@email.com',
    role: 'USER',
    status: 'ACTIVE',
    plan: 'PREMIUM',
    phone: null,
    job: 'Électricien',
    category: 'Électricité',
    city: 'Sfax',
    bio: null,
    image: null,
    video: null,
    interests: [],
    languages: [],
    contact_modes: [],
    experience: null,
    schedule: null,
    price: null,
    rating: 0,
    reviews: 0,
    matches: 3,
    missions: 0,
    total_earnings: 0,
    last_login: null,
    create_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderDetail(user: AdminManagedUser) {
  return render(
    <AdminUserDetail
      user={user}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onChangeStatus={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

describe('AdminUserDetail', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it('falls back to "Membre Matchy+" for a plain member with no job, not a dash', () => {
    renderDetail(buildUser({ job: null }));

    expect(screen.getAllByText('Membre Matchy+').length).toBeGreaterThan(0);
  });

  it('falls back to "Non renseigné" for an unset field other than job', () => {
    renderDetail(buildUser({ experience: null, price: null }));

    expect(screen.getAllByText('Non renseigné').length).toBeGreaterThan(0);
  });

  it('shows the current plan and a marked-as-example billing history on the Abonnement tab', () => {
    renderDetail(buildUser({ plan: 'PREMIUM' }));

    fireEvent.click(screen.getByRole('button', { name: 'Abonnement' }));

    expect(screen.getAllByText('Premium').length).toBeGreaterThan(0);
    expect(screen.getByText('Historique de facturation')).toBeInTheDocument();
    expect(screen.getByText('Données d’exemple')).toBeInTheDocument();
    expect(screen.getByText('Abonnement Premium — Avril 2026')).toBeInTheDocument();
  });

  it('marks the plan as suspended for a banned account', () => {
    renderDetail(buildUser({ status: 'BANNED' }));

    fireEvent.click(screen.getByRole('button', { name: 'Abonnement' }));

    expect(screen.getByText('Suspendu')).toBeInTheDocument();
  });

  it('shows an empty state on the Vidéo tab when the user has no presentation video', () => {
    renderDetail(buildUser({ video: null }));

    fireEvent.click(screen.getByRole('button', { name: 'Vidéo' }));

    expect(screen.getByText('Aucune vidéo de présentation')).toBeInTheDocument();
    expect(adminApi.get).not.toHaveBeenCalled();
  });

  it('loads and plays the stored video on the Vidéo tab', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:admin-user-video'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.mocked(adminApi.get).mockResolvedValue({ data: new Blob(['video']) });

    const { unmount } = renderDetail(
      buildUser({ video: '/uploads/videos/1f3e4151-7f9c-4d7b-a780-c41ef4207feb.mp4' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Vidéo' }));

    expect(await screen.findByText('Présenté par')).toBeInTheDocument();
    const video = document.querySelector('video');
    expect(video).toHaveAttribute('src', 'blob:admin-user-video');

    unmount();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });
});
