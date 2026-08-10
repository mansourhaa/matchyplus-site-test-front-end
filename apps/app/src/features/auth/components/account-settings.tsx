'use client';

import { PasswordRequirements } from '@/components/password-requirements';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import {
  changePassword,
  confirmPhoneLink,
  deleteAccount,
  requestAccountDeleteOtp,
  requestPhoneLink,
  selectAuth,
} from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { IdentityVerificationCamera } from '@/features/identity-verification/components/identity-verification-camera';
import {
  fetchIdentityVerificationStatus,
  fetchLatestIdentityVerification,
  resetIdentityVerification,
  selectIdentityVerification,
  submitIdentitySelfie,
} from '@/features/identity-verification/store/identity-verification-slice';
import { isPasswordPolicySatisfied } from '@/lib/password-policy';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Phone,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';

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

export function ChangePasswordSection() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
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
    if (!isPasswordPolicySatisfied(newPassword)) {
      setError(t('auth.weakPassword'));
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
        placeholder="••••••••"
      />
      <PasswordRequirements password={newPassword} />
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

export function PhoneLinkSection() {
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

// Sized for a cold worker's first job, not the steady-state one. Giving up is only a UI
// decision — the job runs on and is picked up by the latest-job lookup on the next visit.
const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);

export function IdentityVerificationSection() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(selectAuth);
  const { job, identityVerified, submitting, restored, error } = useAppSelector(
    selectIdentityVerification,
  );
  const [timeoutError, setTimeoutError] = useState<string | null>(null);
  const pollAttemptsRef = useRef(0);

  const alreadyVerified = identityVerified || Boolean(user?.verified);
  const isPending = Boolean(job) && !TERMINAL_STATUSES.has(job!.status);

  useEffect(() => {
    if (restored) return;
    void dispatch(fetchLatestIdentityVerification());
  }, [restored, dispatch]);

  // Poll until terminal, capped so a stuck worker can't spin forever.
  useEffect(() => {
    if (!job || TERMINAL_STATUSES.has(job.status)) return;

    if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
      setTimeoutError(
        'La vérification prend plus de temps que prévu. Revenez sur cette page dans quelques minutes pour voir le résultat.',
      );
      return;
    }

    const timer = window.setTimeout(() => {
      pollAttemptsRef.current += 1;
      dispatch(fetchIdentityVerificationStatus(job.id));
    }, POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [job, dispatch]);

  const handleCapture = (selfie: Blob) => {
    pollAttemptsRef.current = 0;
    setTimeoutError(null);
    void dispatch(submitIdentitySelfie(selfie));
  };

  const handleRetry = () => {
    pollAttemptsRef.current = 0;
    setTimeoutError(null);
    dispatch(resetIdentityVerification());
  };

  if (alreadyVerified) {
    return (
      <SettingsCard
        icon={<ShieldCheck size={18} color="#61BCA6" />}
        iconBackground="#E8F7F3"
        title="Identité vérifiée"
        description="Votre selfie correspond à votre photo de profil."
      >
        <InlineBanner kind="success" message="Identité vérifiée ✓" />
      </SettingsCard>
    );
  }

  const failed = job?.status === 'FAILED' || (job?.status === 'SUCCEEDED' && !identityVerified);
  // A fixable capture problem, not a verdict that the user is someone else.
  const noFaceDetected = job?.result?.code === 'no_face_detected';

  return (
    <SettingsCard
      icon={<ShieldCheck size={18} color="#2F76BB" />}
      iconBackground="#E8F0FA"
      title="Vérifier mon identité"
      description="Prenez un selfie pour le comparer à votre photo de profil."
    >
      {restored && !isPending && !failed && (
        <IdentityVerificationCamera onCapture={handleCapture} disabled={submitting} />
      )}

      {(!restored || isPending) && (
        <p style={{ fontSize: '13px', color: '#687284', fontWeight: 600 }}>
          {restored ? 'Vérification en cours...' : 'Chargement...'}
        </p>
      )}

      {error && <InlineBanner kind="error" message={error} />}
      {timeoutError && <InlineBanner kind="error" message={timeoutError} />}
      {failed && (
        <>
          <InlineBanner
            kind="error"
            message={
              noFaceDetected
                ? "Aucun visage n'a été détecté. Placez-vous face à la caméra, dans un endroit bien éclairé, sans lunettes de soleil ni masque."
                : 'La vérification a échoué — le selfie ne correspond pas à votre photo de profil.'
            }
          />
          <button
            type="button"
            onClick={handleRetry}
            className="w-full rounded-xl py-2.5"
            style={{
              border: '1.5px solid #D4E1EE',
              fontSize: '13px',
              fontWeight: 700,
              color: '#253044',
            }}
          >
            Réessayer
          </button>
        </>
      )}
    </SettingsCard>
  );
}

export function DeleteAccountSection() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(selectAuth);
  const hasPassword = Boolean(user?.has_password);
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await dispatch(requestAccountDeleteOtp()).unwrap();
      setOtpSent(true);
    } catch {
      setError(
        user?.phone
          ? "Impossible d'envoyer le code. Réessayez."
          : 'Ajoutez un téléphone à votre compte avant de le supprimer.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await dispatch(
        deleteAccount({
          confirm: true,
          currentPassword: hasPassword ? password || undefined : undefined,
          otpCode: hasPassword ? undefined : otpCode || undefined,
        }),
      ).unwrap();
      router.push('/login');
    } catch {
      setError(
        hasPassword
          ? 'Échec de la suppression. Vérifiez votre mot de passe.'
          : 'Échec de la suppression. Vérifiez le code OTP.',
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
      description={
        hasPassword
          ? 'Action irréversible. Confirmez avec votre mot de passe.'
          : 'Action irréversible. Un code SMS est requis (comptes sans mot de passe).'
      }
    >
      {hasPassword ? (
        <TextField
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      ) : (
        <>
          <TextField
            label="Code OTP"
            type="text"
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value)}
          />
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={submitting}
            className="w-full rounded-xl py-2.5"
            style={{
              border: '1.5px solid #D4E1EE',
              fontSize: '13px',
              fontWeight: 700,
              color: '#253044',
            }}
          >
            {otpSent ? 'Renvoyer le code' : 'Envoyer le code SMS'}
          </button>
        </>
      )}
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
        <IdentityVerificationSection />
        <DeleteAccountSection />
      </div>
    </div>
  );
}
