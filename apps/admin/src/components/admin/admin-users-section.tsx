'use client';

import { AdminAvatarImage } from '@/components/admin/admin-avatar-image';
import { PLAN_COLOR, PLAN_LABEL, STATUS_COLOR, STATUS_LABEL } from '@/features/admin-users/labels';
import type { AdminManagedUser, AdminUserFilters } from '@/features/admin-users/types';
import { useAdminUserPhoto } from '@/hooks/use-admin-user-photo';
import { Check, Download, Edit2, Eye, MapPin, Search, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';

const GRID_COLUMNS = '32px 2.5fr 1.5fr 1fr 1fr 1fr 1fr 100px';

function UserRowAvatar({ user }: { user: AdminManagedUser }) {
  const photoUrl = useAdminUserPhoto(user.id, user.image);
  return (
    <AdminAvatarImage
      photoUrl={photoUrl}
      name={user.name}
      className="h-9 w-9 rounded-xl"
      fontSize={13}
    />
  );
}

function buildCsv(users: AdminManagedUser[]) {
  const header = [
    'ID',
    'Nom',
    'Email',
    'Domaine',
    'Secteur',
    'Ville',
    'Forfait',
    'Statut',
    'Matches',
    'Inscription',
  ];
  const rows = users.map((user) => [
    user.id,
    user.name,
    user.email,
    user.job ?? '',
    user.category ?? '',
    user.city ?? '',
    PLAN_LABEL[user.plan],
    STATUS_LABEL[user.status],
    String(user.matches),
    user.create_at?.slice(0, 10) ?? '',
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');
}

export function AdminUsersSection({
  users,
  filters,
  categoryOptions,
  loading,
  onFiltersChange,
  onOpenUser,
  onDeleteUser,
}: {
  users: AdminManagedUser[];
  filters: AdminUserFilters;
  categoryOptions: string[];
  loading: boolean;
  onFiltersChange: (changes: Partial<AdminUserFilters>) => void;
  onOpenUser: (user: AdminManagedUser) => void;
  onDeleteUser: (user: AdminManagedUser) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleUser = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleExport = () => {
    const blob = new Blob([buildCsv(users)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matchy-admin-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
            placeholder="Nom, email, rôle..."
            aria-label="Rechercher un utilisateur"
            value={filters.search}
            onChange={(event) => onFiltersChange({ search: event.target.value })}
          />
        </div>

        <select
          className="cursor-pointer rounded-xl px-3 py-2 outline-none"
          style={{
            fontSize: '13px',
            color: '#555',
            background: '#F5F7FA',
            border: '1px solid #E0E0E0',
          }}
          aria-label="Filtrer par catégorie"
          value={filters.category}
          onChange={(event) => onFiltersChange({ category: event.target.value })}
        >
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          className="cursor-pointer rounded-xl px-3 py-2 outline-none"
          style={{
            fontSize: '13px',
            color: '#555',
            background: '#F5F7FA',
            border: '1px solid #E0E0E0',
          }}
          aria-label="Filtrer par forfait"
          value={filters.plan}
          onChange={(event) =>
            onFiltersChange({ plan: event.target.value as AdminUserFilters['plan'] })
          }
        >
          <option value="all">Tous forfaits</option>
          <option value="FREE">Gratuit</option>
          <option value="PREMIUM">Premium</option>
          <option value="PREMIUM_PLUS">Premium+</option>
        </select>

        <select
          className="cursor-pointer rounded-xl px-3 py-2 outline-none"
          style={{
            fontSize: '13px',
            color: '#555',
            background: '#F5F7FA',
            border: '1px solid #E0E0E0',
          }}
          aria-label="Filtrer par statut"
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({ status: event.target.value as AdminUserFilters['status'] })
          }
        >
          <option value="all">Tous statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="INACTIVE">Inactif</option>
          <option value="BANNED">Banni</option>
        </select>

        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2"
          style={{ background: '#2F76BB', color: 'white', fontSize: '13px', fontWeight: 600 }}
        >
          <Download size={14} />
          Exporter
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p style={{ fontSize: '13px', color: '#888' }}>
          {users.length} utilisateur{users.length > 1 ? 's' : ''}
          {selectedIds.length > 0 && (
            <span style={{ color: '#2F76BB', fontWeight: 700 }}>
              {' '}
              · {selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

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
          <div />
          <div>Utilisateur</div>
          <div>Domaine</div>
          <div>Ville</div>
          <div>Forfait</div>
          <div>Statut</div>
          <div>Matches</div>
          <div>Actions</div>
        </div>

        {loading && users.length === 0 && (
          <p className="px-4 py-6" style={{ fontSize: '13px', color: '#AAA' }}>
            Chargement des utilisateurs…
          </p>
        )}

        {!loading && users.length === 0 && (
          <p className="px-4 py-6" style={{ fontSize: '13px', color: '#AAA' }}>
            Aucun utilisateur ne correspond à ces filtres.
          </p>
        )}

        {users.map((user) => (
          <div
            key={user.id}
            role="button"
            tabIndex={0}
            className="grid cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFBFC]"
            style={{
              gridTemplateColumns: GRID_COLUMNS,
              borderBottom: '1px solid #F8F8F8',
              background: selectedIds.includes(user.id) ? '#EEF5FF' : undefined,
            }}
            onClick={() => onOpenUser(user)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onOpenUser(user);
            }}
          >
            <button
              type="button"
              aria-label={`Sélectionner ${user.name}`}
              onClick={(event) => {
                event.stopPropagation();
                toggleUser(user.id);
              }}
              className="flex h-5 w-5 items-center justify-center rounded"
              style={{
                border: selectedIds.includes(user.id) ? 'none' : '2px solid #D0D0D0',
                background: selectedIds.includes(user.id) ? '#2F76BB' : 'white',
              }}
            >
              {selectedIds.includes(user.id) && <Check size={12} color="white" />}
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <UserRowAvatar user={user} />
              <div className="min-w-0">
                <p
                  className="truncate"
                  style={{ fontSize: '13px', fontWeight: 700, color: '#353535' }}
                >
                  {user.name}
                </p>
                <p className="truncate" style={{ fontSize: '11px', color: '#AAA' }}>
                  {user.email}
                </p>
              </div>
            </div>

            <div>
              <p style={{ fontSize: '12px', color: '#555' }}>{user.job ?? '—'}</p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {user.interests.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="rounded px-1.5"
                    style={{ fontSize: '10px', background: '#F0F7FF', color: '#2F76BB' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <MapPin size={12} color="#AAA" />
              <span style={{ fontSize: '12px', color: '#555' }}>{user.city ?? '—'}</span>
            </div>

            <span
              className="inline-block rounded-full px-2 py-0.5"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                background: PLAN_COLOR[user.plan] + '20',
                color: PLAN_COLOR[user.plan],
              }}
            >
              {user.plan === 'PREMIUM_PLUS' ? 'P+' : PLAN_LABEL[user.plan]}
            </span>

            <div className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: STATUS_COLOR[user.status] }}
              />
              <span style={{ fontSize: '12px', color: '#555' }}>{STATUS_LABEL[user.status]}</span>
            </div>

            <div className="flex items-center gap-1">
              <Star size={12} color="#F5A623" fill="#F5A623" />
              <span style={{ fontSize: '12px', color: '#353535', fontWeight: 600 }}>
                {user.matches}
              </span>
            </div>

            <div
              className="flex items-center gap-1"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              role="presentation"
            >
              <button
                type="button"
                onClick={() => onOpenUser(user)}
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: '#F5F7FA' }}
                title="Voir le profil"
                aria-label={`Voir le profil de ${user.name}`}
              >
                <Eye size={13} color="#2F76BB" />
              </button>
              <button
                type="button"
                onClick={() => onOpenUser(user)}
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: '#FFF8EE' }}
                title="Modifier"
                aria-label={`Modifier ${user.name}`}
              >
                <Edit2 size={13} color="#F5A623" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteUser(user)}
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: '#FFF0F0' }}
                title="Supprimer"
                aria-label={`Supprimer ${user.name}`}
              >
                <Trash2 size={13} color="#E74C3C" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
