'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import {
  changePassword,
  confirmPhoneLink,
  deleteAccount,
  requestPhoneLink,
  selectAuth,
} from '@/features/auth/store/auth-slice';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Lock, Phone, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { PhoneInput } from './phone-input';

function SettingsCard({
  icon,
  iconBackground,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  iconBackground: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: '1px solid #EEF0F3' }}>
      <div className="mb-3 flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: iconBackground }}
        >
          {icon}
        </div>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 800, color: '#253044' }}>{title}</p>
          <p style={{ fontSize: '12px', color: '#687284', marginTop: '2px' }}>{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InlineBanner({ kind, message }: { kind: 'error' | 'success'; message: string }) {
  const isError = kind === 'error';
  return (
    <div
      className="flex items-start gap-2 rounded-xl px-3 py-2"
      style={{
        background: isError ? '#FFF3F3' : '#E8F7F3',
        border: `1px solid ${isError ? '#FFD9D9' : '#BFE8DD'}`,
      }}
    >
      {isError ? (
        <AlertTriangle size={15} color="#D1445E" style={{ marginTop: '2px', flexShrink: 0 }} />
      ) : (
        <CheckCircle2 size={15} color="#2C9C84" style={{ marginTop: '2px', flexShrink: 0 }} />
      )}
      <p style={{ fontSize: '12px', color: isError ? '#B03A4D' : '#247C69' }}>{message}</p>
    </div>
  );
}

function TextField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label style={{ fontSize: '12px', color: '#7F8A9A', fontWeight: 700 }}>{label}</label>
      <input
        {...props}
        className="mt-1 w-full rounded-xl px-3 py-2.5 outline-none"
        style={{
          border: '1.5px solid #D4E1EE',
          background: '#F8FBFF',
          fontSize: '14px',
          color: '#253044',
        }}
      />
    </div>
  );
}

function SubmitButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl py-3 text-white"
      style={{
        background: disabled ? '#AFC4DA' : 'linear-gradient(90deg, #61BCA6, #2F76BB)',
        fontSize: '14px',
        fontWeight: 700,
      }}
    >
      {loading ? `${children}...` : children}
    </button>
  );
}

function ChangePasswordSection() {
  const dispatch = useAppDispatch();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Tous les champs sont obligatoires');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(changePassword({ currentPassword, newPassword })).unwrap();
      setSuccess(true);
      // Backend revoked the session (force logout) — redirect to login shortly.
      window.setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch {
      setError('Échec de la mise à jour du mot de passe. Vérifiez votre mot de passe actuel.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SettingsCard
      icon={<Lock size={18} color="#2F76BB" />}
      iconBackground="#E8F0FA"
      title="Changer le mot de passe"
      description="Pour des raisons de sécurité, vous serez déconnecté après la modification."
    >
      <PasswordField
        label="Mot de passe actuel"
        value={currentPassword}
        onChange={setCurrentPassword}
        show={showCurrent}
        setShow={setShowCurrent}
      />
      <PasswordField
        label="Nouveau mot de passe"
        value={newPassword}
        onChange={setNewPassword}
        show={showNew}
        setShow={setShowNew}
        placeholder="6 caractères minimum"
      />
      <PasswordField
        label="Confirmer le mot de passe"
        value={confirmPassword}
        onChange={setConfirmPassword}
        show={showNew}
        setShow={setShowNew}
      />
      {error && <InlineBanner kind="error" message={error} />}
      {success && <InlineBanner kind="success" message="Mot de passe mis à jour. Redirection..." />}
      <SubmitButton onClick={handleSubmit} disabled={submitting} loading={submitting}>
        Mettre à jour le mot de passe
      </SubmitButton>
    </SettingsCard>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  setShow,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  setShow: (value: boolean) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: '12px', color: '#7F8A9A', fontWeight: 700 }}>{label}</label>
      <div
        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{ border: '1.5px solid #D4E1EE', background: '#F8FBFF' }}
      >
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none"
          style={{ fontSize: '14px', color: '#253044' }}
        />
        <button type="button" onClick={() => setShow(!show)}>
          {show ? <EyeOff size={17} color="#7F8A9A" /> : <Eye size={17} color="#7F8A9A" />}
        </button>
      </div>
    </div>
  );
}

function PhoneLinkSection() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(selectAuth);
  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY.iso);
  const [nationalNumber, setNationalNumber] = useState('');
  const [code, setCode] = useState('');
  const [codeVisible, setCodeVisible] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);

  const handleRequestCode = async () => {
    setError(null);
    setInfo(null);
    if (nationalNumber.length < country.nationalLength) {
      setError('Entrez un numéro de téléphone valide');
      return;
    }

    setRequestLoading(true);
    try {
      await dispatch(requestPhoneLink({ phone })).unwrap();
      setCodeVisible(true);
      setInfo('Code envoyé par SMS.');
    } catch {
      // Most common case right now: 403 phone_link_not_allowed, since this is only
      // reachable for social (Google/LinkedIn) accounts.
      setError(
        "Échec de l'envoi du code — le lien de téléphone n'est disponible que pour les comptes Google/LinkedIn.",
      );
    } finally {
      setRequestLoading(false);
    }
  };

  const handleConfirmCode = async () => {
    setError(null);
    setInfo(null);
    if (!code.trim()) {
      setError('Entrez le code de vérification');
      return;
    }

    setConfirmLoading(true);
    try {
      await dispatch(confirmPhoneLink({ phone, code: code.trim() })).unwrap();
      setCode('');
      setCodeVisible(false);
      setInfo('Numéro de téléphone confirmé avec succès.');
    } catch {
      setError('Échec de la confirmation du numéro');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <SettingsCard
      icon={<Phone size={18} color="#61BCA6" />}
      iconBackground="#E8F7F3"
      title="Lier un numéro de téléphone"
      description={`Actuel : ${user?.phone ?? '-'} (réservé aux comptes Google/LinkedIn)`}
    >
      <div>
        <label style={{ fontSize: '12px', color: '#7F8A9A', fontWeight: 700 }}>
          Numéro de téléphone
        </label>
        <div className="mt-1">
          <PhoneInput
            countryIso={countryIso}
            nationalNumber={nationalNumber}
            onCountryChange={setCountryIso}
            onNationalNumberChange={setNationalNumber}
          />
        </div>
      </div>
      <SubmitButton onClick={handleRequestCode} disabled={requestLoading} loading={requestLoading}>
        Envoyer le code
      </SubmitButton>

      {codeVisible && (
        <>
          <TextField
            label="Code de vérification"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
          />
          <SubmitButton
            onClick={handleConfirmCode}
            disabled={confirmLoading}
            loading={confirmLoading}
          >
            Confirmer le numéro
          </SubmitButton>
        </>
      )}

      {error && <InlineBanner kind="error" message={error} />}
      {info && <InlineBanner kind="success" message={info} />}
    </SettingsCard>
  );
}

function DeleteAccountSection() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await dispatch(
        deleteAccount({ confirm: true, currentPassword: password || undefined }),
      ).unwrap();
      router.push('/login');
    } catch {
      setError(
        'Échec de la suppression du compte. Vérifiez votre mot de passe si votre compte en a un.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SettingsCard
      icon={<Trash2 size={18} color="#E24E59" />}
      iconBackground="#FFF3F3"
      title="Supprimer le compte"
      description="Action irréversible. Laissez le mot de passe vide si votre compte n'en a pas."
    >
      <TextField
        label="Mot de passe (si applicable)"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error && <InlineBanner kind="error" message={error} />}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full rounded-xl py-3 text-white"
          style={{ background: '#E24E59', fontSize: '14px', fontWeight: 700 }}
        >
          Supprimer mon compte
        </button>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="flex-1 rounded-xl py-3"
            style={{
              border: '1.5px solid #D4E1EE',
              fontSize: '14px',
              fontWeight: 700,
              color: '#253044',
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="flex-1 rounded-xl py-3 text-white"
            style={{
              background: submitting ? '#F0A8AE' : '#E24E59',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            {submitting ? 'Suppression...' : 'Confirmer la suppression'}
          </button>
        </div>
      )}
    </SettingsCard>
  );
}

export function AccountSettings() {
  return (
    <div
      className="min-h-screen"
      style={{ background: '#F5F7FA', fontFamily: "'Baloo 2', sans-serif" }}
    >
      <div
        className="flex items-center px-6 py-4"
        style={{ background: 'white', borderBottom: '1px solid #EEF0F3' }}
      >
        <Link href="/" style={{ fontSize: '13px', fontWeight: 700, color: '#667085' }}>
          ← Retour
        </Link>
        <h1 className="ml-4" style={{ fontSize: '16px', fontWeight: 800, color: '#253044' }}>
          Mon compte
        </h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6">
        <ChangePasswordSection />
        <PhoneLinkSection />
        <DeleteAccountSection />
      </div>
    </div>
  );
}
