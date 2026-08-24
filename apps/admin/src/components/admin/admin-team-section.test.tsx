import type { AdminTeamFilters, AdminTeamMember } from '@/features/admin-team/types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminTeamSection } from './admin-team-section';

const MEMBERS: AdminTeamMember[] = [
  {
    id: 't1',
    name: 'Sami Ben Ali',
    email: 'sami@matchyplus.tn',
    phone: '+21620123456',
    role: 'SUPPORT',
    status: 'ACTIVE',
    last_login: null,
    create_at: '2026-01-01T00:00:00.000Z',
  },
];

const FILTERS: AdminTeamFilters = { search: '' };

function renderSection(overrides: Partial<Parameters<typeof AdminTeamSection>[0]> = {}) {
  const handlers = {
    onFiltersChange: vi.fn(),
    onAddMember: vi.fn(),
    onEditMember: vi.fn(),
    onChangeStatus: vi.fn(),
  };
  render(
    <AdminTeamSection
      members={MEMBERS}
      filters={FILTERS}
      loading={false}
      actorRole="SUPER_ADMIN"
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe('AdminTeamSection', () => {
  afterEach(() => {
    cleanup();
  });

  it('lists team members with their role and status', () => {
    renderSection();

    expect(screen.getByText('Sami Ben Ali')).toBeInTheDocument();
    expect(screen.getByText('sami@matchyplus.tn')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('+21620123456')).toBeInTheDocument();
  });

  it('shows "Ajouter un membre" for a Super Admin and calls onAddMember', () => {
    const { onAddMember } = renderSection({ actorRole: 'SUPER_ADMIN' });

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un membre' }));
    expect(onAddMember).toHaveBeenCalledTimes(1);
  });

  it('hides "Ajouter un membre" for a Support actor', () => {
    renderSection({ actorRole: 'SUPPORT' });

    expect(screen.queryByRole('button', { name: 'Ajouter un membre' })).not.toBeInTheDocument();
  });

  it('reports a filter change from the search box', () => {
    const { onFiltersChange } = renderSection();

    fireEvent.change(screen.getByLabelText("Rechercher dans l'équipe"), {
      target: { value: 'sami' },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ search: 'sami' });
  });

  it('requests an edit for the clicked member', () => {
    const { onEditMember } = renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Modifier Sami Ben Ali' }));
    expect(onEditMember).toHaveBeenCalledWith(MEMBERS[0]);
  });

  it('requests a status change from the row select', () => {
    const { onChangeStatus } = renderSection();

    fireEvent.change(screen.getByLabelText('Statut de Sami Ben Ali'), {
      target: { value: 'BANNED' },
    });
    expect(onChangeStatus).toHaveBeenCalledWith(MEMBERS[0], 'BANNED');
  });

  it('shows an empty state when there are no members', () => {
    renderSection({ members: [] });
    expect(screen.getByText('Aucun membre de l’équipe pour l’instant.')).toBeInTheDocument();
  });
});
