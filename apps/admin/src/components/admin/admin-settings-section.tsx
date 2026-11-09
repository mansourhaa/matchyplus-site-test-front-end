'use client';

import { ROLE_LABELS } from '@/features/admin-auth/schemas';
import { changeAdminPassword, selectAdminAuth } from '@/features/admin-auth/store/admin-auth-slice';
import type { AdminUser } from '@/features/admin-auth/types';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { Check, LogOut, Save } from 'lucide-react';
import { useState } from 'react';

export function AdminSettingsSection({
  admin,
  onLogout,
}: {
  admin: AdminUser | null;
  onLogout: () => void;
}) {
  const dispatch = useAppDispatch();
  // The HTTP call lives in the thunk; the component only dispatches and reads status from the store.
  const { passwordChangeLoading, passwordChangeError } = useAppSelector(selectAdminAuth);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saved, setSaved] = useState(false);
  // Client-side form validation only — server refusals come back through the store.
  const [formError, setFormError] = useState<string | null>(null);

  const handleSave = async () => {
    if (passwordChangeLoading) return;
    setFormError(null);

    if (!currentPassword || !newPassword) {
      setFormError('Veuillez remplir les deux champs mot de passe.');
      return;
    }
    if (newPassword.length < 8) {
      setFormError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    const result = await dispatch(changeAdminPassword({ currentPassword, newPassword }));
    if (changeAdminPassword.fulfilled.match(result)) {
      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => {
        onLogout();
      }, 1500);
    }
  };

  const error = formError ?? passwordChangeError;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #F0F0F0' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E', marginBottom: '16px' }}>
          Profil administrateur
        </p>

        <div
          className="mb-4 flex items-center gap-4 rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, #E8F0FA, #E8F7F3)' }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #2F76BB, #61BCA6)' }}
          >
            <span className="text-white" style={{ fontSize: '22px', fontWeight: 900 }}>
              {admin?.name?.charAt(0) ?? 'A'}
            </span>
          </div>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 800, color: '#1A1A2E' }}>
              {admin?.name ?? 'admin'}
            </p>
            <p style={{ fontSize: '13px', color: '#777' }}>{admin?.email}</p>
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                background: '#2F76BB20',
                color: '#2F76BB',
              }}
            >
              {admin?.role ? (ROLE_LABELS[admin.role] ?? 'Administrateur') : 'Administrateur'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="current-password" style={labelStyle}>
              Mot de passe actuel
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setFormError(null);
              }}
              className="mt-1 w-full rounded-xl px-4 py-3 outline-none"
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="new-password" style={labelStyle}>
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setFormError(null);
              }}
              className="mt-1 w-full rounded-xl px-4 py-3 outline-none"
              style={inputStyle}
              placeholder="••••••••"
            />
            <p style={{ fontSize: '11px', color: '#AAA', marginTop: '4px' }}>
              8 caractères minimum.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={passwordChangeLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3"
            style={{
              background: saved ? '#61BCA6' : '#2F76BB',
              color: 'white',
              fontSize: '14px',
              fontWeight: 700,
              cursor: passwordChangeLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {saved ? (
              <>
                <Check size={16} />
                Sauvegardé ! Reconnexion...
              </>
            ) : (
              <>
                <Save size={16} />
                {passwordChangeLoading ? 'Enregistrement...' : 'Enregistrer'}
              </>
            )}
          </button>

          {error && <p style={{ fontSize: '12px', color: '#E74C3C', fontWeight: 600 }}>{error}</p>}
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4"
        style={{
          background: '#FFF0F0',
          color: '#E74C3C',
          fontSize: '14px',
          fontWeight: 700,
          border: '1.5px solid #FFD0D0',
        }}
      >
        <LogOut size={18} />
        Se déconnecter du panneau admin
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  background: '#F5F7FA',
  color: '#1A1A2E',
  border: '1.5px solid #E0E0E0',
  fontSize: '14px',
};
