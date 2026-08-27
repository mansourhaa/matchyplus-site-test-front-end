'use client';

import type { AdminRole } from '@/features/admin-auth/types';
import {
  createAdminTeamMember,
  selectAdminTeam,
} from '@/features/admin-team/store/admin-team-slice';
import type { AdminCreateTeamMemberInput, TeamRole } from '@/features/admin-team/types';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { ShieldPlus, X } from 'lucide-react';
import { useState } from 'react';

const inputStyle: React.CSSProperties = {
  fontSize: '13px',
  background: '#F5F7FA',
  border: '1.5px solid #D0E4F7',
  color: '#1A1A2E',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
}

const initialForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'SUPPORT' as TeamRole,
};

export function AdminAddTeamMemberModal({
  isOpen,
  actorRole,
  onClose,
}: {
  isOpen: boolean;
  actorRole: AdminRole;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const { creating } = useAppSelector(selectAdminTeam);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  // A Moderator can only ever create Support accounts — Moderator itself is only offered
  // to a Super Admin, matching what the backend actually allows.
  const roleOptions: TeamRole[] =
    actorRole === 'SUPER_ADMIN' ? ['SUPPORT', 'MODERATOR'] : ['SUPPORT'];

  const set = <K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetAndClose = () => {
    setForm(initialForm);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setFormError('Le nom, l’email et le mot de passe sont obligatoires.');
      return;
    }

    const input: AdminCreateTeamMemberInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim() || undefined,
      role: form.role,
    };

    const result = await dispatch(createAdminTeamMember(input));
    if (createAdminTeamMember.fulfilled.match(result)) {
      resetAndClose();
    } else {
      setFormError((result.payload as string | undefined) ?? 'Impossible de créer ce compte.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="animate-in fade-in zoom-in w-full max-w-md overflow-hidden rounded-2xl duration-200"
        style={{ background: 'white', boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #F0F0F0' }}
        >
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E' }}>
            Ajouter un membre de l’équipe
          </p>
          <button
            type="button"
            onClick={resetAndClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: '#F5F7FA' }}
            aria-label="Fermer"
          >
            <X size={16} color="#888" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {formError && (
            <p
              className="rounded-xl px-4 py-3"
              style={{
                background: '#FFF0F0',
                border: '1px solid #FFCCCC',
                color: '#E74C3C',
                fontSize: '13px',
              }}
            >
              {formError}
            </p>
          )}

          <Field label="Nom complet" htmlFor="team-name">
            <input
              id="team-name"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              className="rounded-xl px-3 py-2 outline-none"
              style={inputStyle}
            />
          </Field>

          <Field label="Email" htmlFor="team-email">
            <input
              id="team-email"
              type="email"
              value={form.email}
              onChange={(event) => set('email', event.target.value)}
              className="rounded-xl px-3 py-2 outline-none"
              style={inputStyle}
            />
          </Field>

          <Field label="Mot de passe" htmlFor="team-password">
            <input
              id="team-password"
              type="password"
              value={form.password}
              onChange={(event) => set('password', event.target.value)}
              className="rounded-xl px-3 py-2 outline-none"
              style={inputStyle}
            />
          </Field>

          <Field label="Téléphone (optionnel)" htmlFor="team-phone">
            <input
              id="team-phone"
              value={form.phone}
              onChange={(event) => set('phone', event.target.value)}
              className="rounded-xl px-3 py-2 outline-none"
              style={inputStyle}
            />
          </Field>

          <Field label="Rôle" htmlFor="team-role">
            <select
              id="team-role"
              value={form.role}
              onChange={(event) => set('role', event.target.value as TeamRole)}
              className="cursor-pointer rounded-xl px-3 py-2 outline-none"
              style={inputStyle}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role === 'SUPPORT' ? 'Support' : 'Modérateur'}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #F0F0F0' }}
        >
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-xl px-4 py-2.5"
            style={{ fontSize: '13px', fontWeight: 600, color: '#555', background: '#F5F7FA' }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={creating}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-white disabled:opacity-60"
            style={{
              background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <ShieldPlus size={15} />
            {creating ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
      </div>
    </div>
  );
}
