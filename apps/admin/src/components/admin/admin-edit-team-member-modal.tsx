'use client';

import { updateAdminTeamMember } from '@/features/admin-team/store/admin-team-slice';
import type { AdminTeamMember } from '@/features/admin-team/types';
import { useAppDispatch } from '@/features/auth/hooks';
import { Save, X } from 'lucide-react';
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

/**
 * Rendered with `key={member?.id}` from the parent so switching between two different
 * members — or opening after closing — remounts this component instead of needing an
 * effect to resync local state from a changed prop.
 */
export function AdminEditTeamMemberModal({
  member,
  onClose,
}: {
  member: AdminTeamMember | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!member) return null;

  const handleSubmit = async () => {
    setFormError(null);
    if (!name.trim() || !email.trim()) {
      setFormError('Le nom et l’email sont obligatoires.');
      return;
    }

    setSaving(true);
    const result = await dispatch(
      updateAdminTeamMember({
        id: member.id,
        changes: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined },
      }),
    );
    setSaving(false);

    if (updateAdminTeamMember.fulfilled.match(result)) {
      onClose();
    } else {
      setFormError(
        (result.payload as string | undefined) ?? "Impossible d'enregistrer les modifications.",
      );
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
            Modifier {member.name}
          </p>
          <button
            type="button"
            onClick={onClose}
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

          <Field label="Nom complet" htmlFor="edit-team-name">
            <input
              id="edit-team-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl px-3 py-2 outline-none"
              style={inputStyle}
            />
          </Field>

          <Field label="Email" htmlFor="edit-team-email">
            <input
              id="edit-team-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl px-3 py-2 outline-none"
              style={inputStyle}
            />
          </Field>

          <Field label="Téléphone (optionnel)" htmlFor="edit-team-phone">
            <input
              id="edit-team-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-xl px-3 py-2 outline-none"
              style={inputStyle}
            />
          </Field>
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #F0F0F0' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5"
            style={{ fontSize: '13px', fontWeight: 600, color: '#555', background: '#F5F7FA' }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-white disabled:opacity-60"
            style={{
              background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <Save size={15} />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
