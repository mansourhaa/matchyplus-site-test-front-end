import rootReducer from '@/features/auth/store/root-reducer';
import { adminApi } from '@/lib/admin-api';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminPanel } from './admin-panel';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

const STATS = {
  totalUsers: 3,
  activeUsers: 1,
  inactiveUsers: 1,
  bannedUsers: 1,
  freeUsers: 2,
  premiumUsers: 1,
  premiumPlusUsers: 0,
};

const baseUser = {
  role: 'USER',
  bio: null,
  image: null,
  interests: [],
  languages: [],
  contact_modes: [],
  experience: null,
  schedule: null,
  price: null,
  phone: null,
  rating: 0,
  reviews: 0,
  matches: 0,
  missions: 0,
  total_earnings: 0,
  last_login: null,
  create_at: '2026-01-01T00:00:00.000Z',
};

const USERS = [
  {
    ...baseUser,
    id: 'u1',
    name: 'Karim B.',
    email: 'karim.b@email.com',
    status: 'ACTIVE',
    plan: 'PREMIUM',
    job: 'Électricien',
    category: 'Électricité',
    city: 'Sfax',
    matches: 32,
  },
  {
    ...baseUser,
    id: 'u2',
    name: 'Riadh T.',
    email: 'riadh.t@email.com',
    status: 'BANNED',
    plan: 'FREE',
    job: 'Plombier',
    category: 'Plomberie',
    city: 'Ariana',
    matches: 8,
  },
  {
    ...baseUser,
    id: 'u3',
    name: 'Bilel M.',
    email: 'bilel.m@email.com',
    status: 'INACTIVE',
    plan: 'FREE',
    job: 'Mécanicien',
    category: 'Mécanique',
    city: 'Nabeul',
    matches: 15,
  },
];

const PLANS = [
  {
    id: 'FREE',
    name: 'Gratuit',
    price: 0,
    color: '#888888',
    is_active: true,
    badge: '',
    trial_days: 0,
    description: 'Accès limité',
    features: ['Chat basique'],
    swipes_per_day: 20,
    profiles_per_category: 3,
    messages_per_day: 5,
    actions_per_day: 10,
    boosts_per_month: 0,
    super_connects_per_month: 0,
    sort_order: 0,
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 9.9,
    color: '#2F76BB',
    is_active: true,
    badge: 'Populaire',
    trial_days: 7,
    description: 'Accès complet',
    features: ['Profils illimités', 'Swipe illimité'],
    swipes_per_day: -1,
    profiles_per_category: -1,
    messages_per_day: -1,
    actions_per_day: -1,
    boosts_per_month: 1,
    super_connects_per_month: 0,
    sort_order: 1,
  },
];

const ANALYTICS = {
  signupsTimeline: [
    { month: '2026-06', users: 2 },
    { month: '2026-07', users: 4 },
  ],
  platformTimeline: [
    { month: '2026-06', users: 2, revenue: 0 },
    { month: '2026-07', users: 6, revenue: 9.9 },
  ],
  trends: { users: 14.3, revenue: 8.7, matches: 0, conversion: -12.5 },
  categoryDistribution: [
    { name: 'Ménage', value: 2 },
    { name: 'Plomberie', value: 1 },
  ],
  matchesByCategory: [
    { name: 'Ménage', value: 89 },
    { name: 'Plomberie', value: 8 },
  ],
  topCities: [{ city: 'Tunis', users: 2 }],
  revenueByPlan: [{ plan: 'Premium', users: 1, monthlyRevenue: 9.9 }],
  totalMatches: 97,
  estimatedMonthlyRevenue: 9.9,
};

const reportParty = (id: string, name: string, status = 'ACTIVE') => ({
  id,
  name,
  email: `${name.toLowerCase().replace(/\W/g, '')}@x.tn`,
  image: null,
  status,
  city: null,
  job: null,
});

// Two reports against the same reported user (Riadh) by different reporters, plus one other.
const REPORTS = [
  {
    id: 'rep1',
    reason: 'Comportement inapproprié',
    details: 'Messages déplacés.',
    status: 'PENDING',
    create_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    reporter: reportParty('u10', 'Fatma A.'),
    reported: reportParty('u2', 'Riadh T.', 'ACTIVE'),
  },
  {
    id: 'rep2',
    reason: 'Faux profil',
    details: null,
    status: 'PENDING',
    create_at: '2026-07-02T00:00:00.000Z',
    updated_at: '2026-07-02T00:00:00.000Z',
    reporter: reportParty('u11', 'Ines H.'),
    reported: reportParty('u2', 'Riadh T.', 'ACTIVE'),
  },
  {
    id: 'rep3',
    reason: 'Spam',
    details: 'Liens publicitaires.',
    status: 'REVIEWED',
    create_at: '2026-07-03T00:00:00.000Z',
    updated_at: '2026-07-03T00:00:00.000Z',
    reporter: reportParty('u12', 'Sonia R.'),
    reported: reportParty('u3', 'Bilel M.', 'INACTIVE'),
  },
];

function mockApi() {
  vi.spyOn(adminApi, 'get').mockImplementation((async (url: string) => {
    if (url === '/admin/stats') return { data: { stats: STATS } };
    if (url === '/admin/users') return { data: { users: USERS, total: USERS.length } };
    if (url === '/admin/plans') return { data: { plans: PLANS } };
    if (url === '/admin/analytics') return { data: { analytics: ANALYTICS } };
    if (url === '/admin/reports') return { data: { reports: REPORTS } };
    const id = url.split('/').pop();
    return { data: { user: USERS.find((u) => u.id === id) } };
  }) as never);
}

function renderPanel() {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
  return {
    store,
    ...render(
      <Provider store={store}>
        <AdminPanel />
      </Provider>,
    ),
  };
}

async function gotoUsers() {
  fireEvent.click(screen.getByRole('button', { name: 'Utilisateurs' }));
  expect(await screen.findByText('karim.b@email.com')).toBeInTheDocument();
}

async function openDetail(name: string) {
  await gotoUsers();
  fireEvent.click(screen.getByRole('button', { name: `Voir le profil de ${name}` }));
  await screen.findByText('Zone dangereuse');
}

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApi();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
    push.mockClear();
  });

  it('shows the source-style stat cards computed from real data', async () => {
    renderPanel();

    expect(await screen.findByText('Utilisateurs total')).toBeInTheDocument();
    expect(screen.getByText('Matches cumulés')).toBeInTheDocument();
    expect(screen.getByText('Revenus estimés (DT)')).toBeInTheDocument();
    expect(screen.getByText('Taux conversion')).toBeInTheDocument();

    // Conversion is (premium + premium+) / total = 1/3 → 33%, derived not hardcoded.
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('97')).toBeInTheDocument();
  });

  it('renders the évolution and forfaits panels on the dashboard', async () => {
    renderPanel();

    expect(await screen.findByText('Évolution de la plateforme')).toBeInTheDocument();
    expect(screen.getByText('Répartition forfaits')).toBeInTheDocument();
  });

  it('shows real month-over-month trend badges, including a negative one', async () => {
    renderPanel();

    // Positive user growth and a negative conversion trend, both from the analytics payload.
    expect(await screen.findByText('14.3%')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('lists users with their plan and status in the table', async () => {
    renderPanel();
    await gotoUsers();

    expect(screen.getByText('Karim B.')).toBeInTheDocument();
    expect(screen.getByText('3 utilisateurs')).toBeInTheDocument();

    // Scoped to the row, since "Banni" is also one of the filter options.
    const bannedRow = screen
      .getByText('riadh.t@email.com')
      .closest<HTMLElement>('[role="button"]')!;
    expect(within(bannedRow).getByText('Banni')).toBeInTheDocument();
    expect(within(bannedRow).getByText('Gratuit')).toBeInTheDocument();
  });

  it('requests the api again when the status filter changes', async () => {
    renderPanel();
    await gotoUsers();

    const get = vi.mocked(adminApi.get);
    get.mockClear();

    fireEvent.change(screen.getByLabelText('Filtrer par statut'), { target: { value: 'BANNED' } });

    await waitFor(() =>
      expect(
        get.mock.calls.some(
          ([url, config]) =>
            url === '/admin/users' &&
            (config as { params?: Record<string, unknown> })?.params?.status === 'BANNED',
        ),
      ).toBe(true),
    );
  });

  it('opens the user detail panel and fetches the full record', async () => {
    renderPanel();
    await openDetail('Karim B.');

    expect(vi.mocked(adminApi.get)).toHaveBeenCalledWith('/admin/users/u1');
    expect(screen.getByText('Informations personnelles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bannir/ })).toBeInTheDocument();
  });

  it('bans an active user through the status endpoint', async () => {
    const patch = vi
      .spyOn(adminApi, 'patch')
      .mockResolvedValue({ data: { user: { ...USERS[0], status: 'BANNED' } } } as never);

    renderPanel();
    await openDetail('Karim B.');

    fireEvent.click(screen.getByRole('button', { name: /^Bannir$/ }));
    // Confirmation step: nothing is sent until the admin confirms.
    expect(patch).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByText('Bannir cet utilisateur ?'));
    const confirm = screen.getAllByRole('button', { name: 'Bannir' }).at(-1)!;
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/admin/users/u1/status', { status: 'BANNED' }),
    );
  });

  it('offers reactivation instead of ban for an already banned user', async () => {
    const patch = vi
      .spyOn(adminApi, 'patch')
      .mockResolvedValue({ data: { user: { ...USERS[1], status: 'ACTIVE' } } } as never);

    renderPanel();
    await openDetail('Riadh T.');

    fireEvent.click(screen.getByRole('button', { name: /^Réactiver$/ }));
    const confirm = screen.getAllByRole('button', { name: 'Réactiver' }).at(-1)!;
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/admin/users/u2/status', { status: 'ACTIVE' }),
    );
  });

  it('saves edited profile fields through the update endpoint', async () => {
    const put = vi
      .spyOn(adminApi, 'put')
      .mockResolvedValue({ data: { user: { ...USERS[0], city: 'Tunis' } } } as never);

    renderPanel();
    await openDetail('Karim B.');

    fireEvent.click(screen.getByRole('button', { name: /Modifier/ }));
    fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Tunis' } });
    fireEvent.click(screen.getByRole('button', { name: /Sauvegarder les modifications/ }));

    await waitFor(() => expect(put).toHaveBeenCalledWith('/admin/users/u1', { city: 'Tunis' }));
  });

  it('deletes a user from the table only after confirmation', async () => {
    const del = vi
      .spyOn(adminApi, 'delete')
      .mockResolvedValue({ data: { deleted: true } } as never);

    renderPanel();
    await gotoUsers();

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Karim B.' }));
    expect(del).not.toHaveBeenCalled();
    expect(screen.getByText("Supprimer l'utilisateur")).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer définitivement' }));

    await waitFor(() => expect(del).toHaveBeenCalledWith('/admin/users/u1'));
  });

  it('surfaces an error instead of failing silently when a delete is rejected', async () => {
    vi.spyOn(adminApi, 'delete').mockRejectedValue(new Error('Network Error'));

    renderPanel();
    await gotoUsers();

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Karim B.' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer définitivement' }));

    expect(await screen.findByText('Impossible de supprimer cet utilisateur.')).toBeInTheDocument();
    // The row must stay: nothing was deleted server-side. (The name also appears in the
    // confirmation popup, which stays open on failure, so scope this to the table row.)
    const row = screen.getByText('karim.b@email.com').closest<HTMLElement>('[role="button"]')!;
    expect(within(row).getByText('Karim B.')).toBeInTheDocument();
  });

  it('surfaces an error when saving edits is rejected', async () => {
    vi.spyOn(adminApi, 'put').mockRejectedValue(new Error('Network Error'));

    renderPanel();
    await openDetail('Karim B.');

    fireEvent.click(screen.getByRole('button', { name: /Modifier/ }));
    fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Tunis' } });
    fireEvent.click(screen.getByRole('button', { name: /Sauvegarder les modifications/ }));

    expect(
      await screen.findByText("Impossible d'enregistrer les modifications."),
    ).toBeInTheDocument();
  });

  it('logs the admin out back to the admin login', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Déconnexion/ }));
    expect(push).toHaveBeenCalledWith('/admin/login');
  });

  describe('Abonnements', () => {
    it('breaks down accounts per plan and shows revenue derived from the plan price', async () => {
      renderPanel();
      fireEvent.click(await screen.findByRole('button', { name: 'Abonnements' }));

      expect(await screen.findByText('Comptes Gratuit')).toBeInTheDocument();
      expect(screen.getByText('Comptes Premium')).toBeInTheDocument();
      // Revenue is the estimate returned by the API, labelled as such.
      expect(screen.getByText(/9\.90 DT/)).toBeInTheDocument();
      expect(screen.getByText(/Estimation/)).toBeInTheDocument();
    });
  });

  describe('Gestion Forfaits', () => {
    it('saves an edited plan price through the plans endpoint', async () => {
      const put = vi
        .spyOn(adminApi, 'put')
        .mockResolvedValue({ data: { plan: { ...PLANS[1], price: 14.5 } } } as never);

      renderPanel();
      fireEvent.click(await screen.findByRole('button', { name: 'Gestion Forfaits' }));

      // The first plan is selected by default; switch to Premium and edit its price.
      fireEvent.click(await screen.findByText('Premium'));
      fireEvent.change(screen.getByLabelText('Prix (DT / mois)'), { target: { value: '14.5' } });
      fireEvent.click(screen.getByRole('button', { name: /Enregistrer le forfait/ }));

      await waitFor(() =>
        expect(put).toHaveBeenCalledWith(
          '/admin/plans/PREMIUM',
          expect.objectContaining({ price: 14.5 }),
        ),
      );
    });

    it('toggles a plan active state without opening the editor', async () => {
      const put = vi
        .spyOn(adminApi, 'put')
        .mockResolvedValue({ data: { plan: { ...PLANS[1], is_active: false } } } as never);

      renderPanel();
      fireEvent.click(await screen.findByRole('button', { name: 'Gestion Forfaits' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Désactiver Premium' }));

      await waitFor(() =>
        expect(put).toHaveBeenCalledWith('/admin/plans/PREMIUM', { is_active: false }),
      );
    });

    it('adds and removes plan features', async () => {
      renderPanel();
      fireEvent.click(await screen.findByRole('button', { name: 'Gestion Forfaits' }));
      fireEvent.click(await screen.findByText('Premium'));
      fireEvent.click(screen.getByRole('button', { name: 'Fonctionnalités' }));

      fireEvent.change(screen.getByLabelText('Nouvelle fonctionnalité'), {
        target: { value: 'Support prioritaire' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Ajouter/ }));

      expect(screen.getByDisplayValue('Support prioritaire')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Supprimer la fonctionnalité 1' }));
      expect(screen.queryByDisplayValue('Profils illimités')).not.toBeInTheDocument();
    });

    it('reverts local edits when cancelled', async () => {
      renderPanel();
      fireEvent.click(await screen.findByRole('button', { name: 'Gestion Forfaits' }));
      fireEvent.click(await screen.findByText('Premium'));

      const price = screen.getByLabelText('Prix (DT / mois)');
      fireEvent.change(price, { target: { value: '99' } });
      expect(price).toHaveValue(99);

      fireEvent.click(screen.getByRole('button', { name: /Annuler/ }));
      expect(screen.getByLabelText('Prix (DT / mois)')).toHaveValue(9.9);
    });
  });

  describe('Analytiques', () => {
    it('renders only metrics the api actually returns', async () => {
      renderPanel();
      fireEvent.click(await screen.findByRole('button', { name: 'Analytiques' }));

      expect(await screen.findByText('Matches cumulés')).toBeInTheDocument();
      expect(screen.getByText('97')).toBeInTheDocument();
      expect(screen.getByText('Inscriptions par mois')).toBeInTheDocument();
      expect(screen.getByText('Villes les plus actives')).toBeInTheDocument();
      expect(screen.getByText('Tunis')).toBeInTheDocument();

      // No wallet model exists, so those cards from the source are deliberately absent.
      expect(screen.queryByText(/Solde portefeuille/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Points bonus/)).not.toBeInTheDocument();
    });
  });

  describe('Paramètres', () => {
    // Regression: the password fields had a light-gray background but no explicit text
    // color, so they inherited the theme's default foreground — near-white in dark mode,
    // making the typed dots invisible against the input's own background until selected.
    it('gives the password fields an explicit dark text color', async () => {
      renderPanel();
      fireEvent.click(await screen.findByRole('button', { name: 'Paramètres' }));

      expect(screen.getByLabelText('Mot de passe actuel')).toHaveStyle({ color: '#1A1A2E' });
      expect(screen.getByLabelText('Nouveau mot de passe')).toHaveStyle({ color: '#1A1A2E' });
    });

    it('changes the password through the api', async () => {
      const post = vi
        .spyOn(adminApi, 'post')
        .mockResolvedValue({ data: { updated: true } } as never);

      renderPanel();
      fireEvent.click(await screen.findByRole('button', { name: 'Paramètres' }));

      fireEvent.change(screen.getByLabelText('Mot de passe actuel'), {
        target: { value: 'matchy2026' },
      });
      fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
        target: { value: 'newpass2026' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));

      await waitFor(() =>
        expect(post).toHaveBeenCalledWith('/admin/change-password', {
          currentPassword: 'matchy2026',
          newPassword: 'newpass2026',
        }),
      );
      expect(await screen.findByText(/Sauvegardé/)).toBeInTheDocument();
    });

    it('rejects a short new password before calling the api', async () => {
      const post = vi.spyOn(adminApi, 'post');

      renderPanel();
      fireEvent.click(await screen.findByRole('button', { name: 'Paramètres' }));

      fireEvent.change(screen.getByLabelText('Mot de passe actuel'), { target: { value: 'x' } });
      fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
        target: { value: 'short' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));

      expect(
        await screen.findByText('Le nouveau mot de passe doit contenir au moins 8 caractères.'),
      ).toBeInTheDocument();
      expect(post).not.toHaveBeenCalled();
    });

    it('surfaces a wrong current password', async () => {
      vi.spyOn(adminApi, 'post').mockRejectedValue(new Error('invalid current password'));

      renderPanel();
      fireEvent.click(await screen.findByRole('button', { name: 'Paramètres' }));

      fireEvent.change(screen.getByLabelText('Mot de passe actuel'), {
        target: { value: 'wrong' },
      });
      fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
        target: { value: 'newpass2026' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));

      expect(await screen.findByText('Mot de passe actuel incorrect.')).toBeInTheDocument();
    });
  });

  describe('Signalements', () => {
    async function gotoReports() {
      fireEvent.click(await screen.findByRole('button', { name: /Signalements/ }));
      await screen.findByText('Riadh T.');
    }

    it('groups reports per reported user and shows who filed each one', async () => {
      renderPanel();
      await gotoReports();

      // Riadh has two reports; both reporters are shown under his group.
      expect(screen.getByText('Fatma A.')).toBeInTheDocument();
      expect(screen.getByText('Ines H.')).toBeInTheDocument();
      expect(screen.getByText('Comportement inapproprié')).toBeInTheDocument();
      expect(screen.getByText('Faux profil')).toBeInTheDocument();
      // The other reported user is a separate group.
      expect(screen.getByText('Bilel M.')).toBeInTheDocument();
    });

    it('shows a pending-report badge on the Signalements nav item', async () => {
      renderPanel();
      // Two of the three seeded reports are PENDING; the badge lives on the nav button.
      const nav = await screen.findByRole('button', { name: /Signalements/ });
      expect(await within(nav).findByText('2')).toBeInTheDocument();
    });

    it('updates a report treatment status through the reports endpoint', async () => {
      const patch = vi
        .spyOn(adminApi, 'patch')
        .mockResolvedValue({ data: { report: { ...REPORTS[0], status: 'RESOLVED' } } } as never);

      renderPanel();
      await gotoReports();

      // The first Riadh report is pending; resolve it. Exact name so the "Résolus" filter
      // button (substring match) is not picked instead.
      fireEvent.click(screen.getAllByRole('button', { name: 'Résolu' })[0]);

      await waitFor(() =>
        expect(patch).toHaveBeenCalledWith('/admin/reports/rep1', { status: 'RESOLVED' }),
      );
    });

    it('bans the reported user directly from their report group', async () => {
      const patch = vi
        .spyOn(adminApi, 'patch')
        .mockResolvedValue({ data: { user: { id: 'u2', status: 'BANNED' } } } as never);

      renderPanel();
      await gotoReports();

      // Each reported-user header has a Bannir button; the first is Riadh's.
      fireEvent.click(screen.getAllByRole('button', { name: /Bannir/ })[0]);

      await waitFor(() =>
        expect(patch).toHaveBeenCalledWith('/admin/users/u2/status', { status: 'BANNED' }),
      );
    });
  });
});
