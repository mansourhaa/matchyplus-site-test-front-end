'use client';

import { AdminAvatarImage } from '@/components/admin/admin-avatar-image';
import { ROLE_LABELS } from '@/features/admin-auth/schemas';
import type { AdminRole } from '@/features/admin-auth/types';
import type { AdminTeamFilters, AdminTeamMember, TeamStatus } from '@/features/admin-team/types';
import { Edit2, Mail, Phone, Search, ShieldPlus } from 'lucide-react';

const GRID_COLUMNS = '2.5fr 1fr 1.5fr 1fr 90px';

const STATUS_COLOR: Record<TeamStatus, string> = {
  ACTIVE: '#61BCA6',
  INACTIVE: '#F5A623',
  BANNED: '#E74C3C',
};

const STATUS_LABEL: Record<TeamStatus, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  BANNED: 'Banni',
};

export function AdminTeamSection({
  members,
  filters,
  loading,
  actorRole,
  onFiltersChange,
  onAddMember,
  onEditMember,
  onChangeStatus,
}: {
  members: AdminTeamMember[];
  filters: AdminTeamFilters;
  loading: boolean;
  actorRole: AdminRole;
  onFiltersChange: (changes: Partial<AdminTeamFilters>) => void;
  onAddMember: () => void;
  onEditMember: (member: AdminTeamMember) => void;
  onChangeStatus: (member: AdminTeamMember, status: TeamStatus) => void;
}) {
  // Nothing outranks a peer, so a Moderator can only ever create/manage Support accounts —
  // only a Super Admin can also reach Moderator accounts here.
  const canCreate = actorRole === 'SUPER_ADMIN' || actorRole === 'MODERATOR';

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap items-center gap-3 rounded-2xl p-4"
        style={{ background: 'white', border: '1px solid #F0F0F0' }}
      >
        <div
          className="flex min-w-48 flex-1 items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: '#F5F7FA', border: '1px solid #E0E0E0' }}
        >
          <Search size={15} color="#AAA" />
          <input
            className="flex-1 bg-transparent text-[#353535] outline-none"
            style={{ fontSize: '13px' }}
            placeholder="Nom ou email..."
            aria-label="Rechercher dans l'équipe"
            value={filters.search}
            onChange={(event) => onFiltersChange({ search: event.target.value })}
          />
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={onAddMember}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2"
            style={{ background: '#61BCA6', color: 'white', fontSize: '13px', fontWeight: 600 }}
          >
            <ShieldPlus size={14} />
            Ajouter un membre
          </button>
        )}
      </div>

      <p style={{ fontSize: '13px', color: '#888' }}>
        {members.length} membre{members.length > 1 ? 's' : ''}
      </p>

      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: 'white', border: '1px solid #F0F0F0' }}
      >
        <div
          className="grid gap-3 px-4 py-3"
          style={{
            gridTemplateColumns: GRID_COLUMNS,
            background: '#F5F7FA',
            color: '#888',
            borderBottom: '1px solid #F0F0F0',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          <div>Membre</div>
          <div>Rôle</div>
          <div>Téléphone</div>
          <div>Statut</div>
          <div>Actions</div>
        </div>

        {loading && members.length === 0 && (
          <p className="px-4 py-6" style={{ fontSize: '13px', color: '#AAA' }}>
            Chargement de l’équipe…
          </p>
        )}

        {!loading && members.length === 0 && (
          <p className="px-4 py-6" style={{ fontSize: '13px', color: '#AAA' }}>
            Aucun membre de l’équipe pour l’instant.
          </p>
        )}

        {members.map((member) => (
          <div
            key={member.id}
            className="grid items-center gap-3 px-4 py-3"
            style={{ gridTemplateColumns: GRID_COLUMNS, borderBottom: '1px solid #F8F8F8' }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <AdminAvatarImage
                photoUrl={null}
                name={member.name}
                className="h-9 w-9 rounded-xl"
                fontSize={13}
              />
              <div className="min-w-0">
                <p
                  className="truncate"
                  style={{ fontSize: '13px', fontWeight: 700, color: '#353535' }}
                >
                  {member.name}
                </p>
                <p
                  className="flex items-center gap-1 truncate"
                  style={{ fontSize: '11px', color: '#AAA' }}
                >
                  <Mail size={11} />
                  {member.email ?? '—'}
                </p>
              </div>
            </div>

            <span
              className="inline-block w-fit rounded-full px-2 py-0.5"
              style={{ fontSize: '11px', fontWeight: 700, background: '#F0F7FF', color: '#2F76BB' }}
            >
              {ROLE_LABELS[member.role] ?? member.role}
            </span>

            <div className="flex items-center gap-1">
              <Phone size={12} color="#AAA" />
              <span style={{ fontSize: '12px', color: '#555' }}>{member.phone ?? '—'}</span>
            </div>

            <select
              className="w-fit cursor-pointer rounded-lg px-2 py-1 outline-none"
              style={{ fontSize: '12px', fontWeight: 600, color: STATUS_COLOR[member.status] }}
              value={member.status}
              onChange={(event) => onChangeStatus(member, event.target.value as TeamStatus)}
              aria-label={`Statut de ${member.name}`}
            >
              <option value="ACTIVE">{STATUS_LABEL.ACTIVE}</option>
              <option value="INACTIVE">{STATUS_LABEL.INACTIVE}</option>
              <option value="BANNED">{STATUS_LABEL.BANNED}</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEditMember(member)}
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: '#FFF8EE' }}
                title="Modifier"
                aria-label={`Modifier ${member.name}`}
              >
                <Edit2 size={13} color="#F5A623" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
