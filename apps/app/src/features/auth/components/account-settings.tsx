'use client';

import { matchyBrand } from '@/components/matchy/brand';
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
        background: disabled ? '#AFC4DA' : matchyBrand.gradient,
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
  const { t, locale } = useI18n();
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
      setError(
        locale === 'en'
          ? 'All fields are required'
          : locale === 'ar'
            ? 'جميع الحقول مطلوبة'
            : 'Tous les champs sont obligatoires',
      );
      return;
    }
    if (!isPasswordPolicySatisfied(newPassword)) {
      setError(t('auth.weakPassword'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(
        locale === 'en'
          ? 'Passwords do not match'
          : locale === 'ar'
            ? 'كلمتا المرور غير متطابقتين'
            : 'Les mots de passe ne correspondent pas',
      );
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
      setError(
        locale === 'en'
          ? 'Failed to update the password. Check your current password.'
          : locale === 'ar'
            ? 'فشل تحديث كلمة المرور. تحقق من كلمة مرورك الحالية.'
            : 'Échec de la mise à jour du mot de passe. Vérifiez votre mot de passe actuel.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SettingsCard
      icon={<Lock size={18} color="#2F76BB" />}
      iconBackground="#E8F0FA"
      title={
        locale === 'en'
          ? 'Change password'
          : locale === 'ar'
            ? 'تغيير كلمة المرور'
            : 'Changer le mot de passe'
      }
      description={
        locale === 'en'
          ? 'For security reasons, you will be signed out after the change.'
          : locale === 'ar'
            ? 'لأسباب أمنية، سيتم تسجيل خروجك بعد التعديل.'
            : 'Pour des raisons de sécurité, vous serez déconnecté après la modification.'
      }
    >
      <PasswordField
        label={
          locale === 'en'
            ? 'Current password'
            : locale === 'ar'
              ? 'كلمة المرور الحالية'
              : 'Mot de passe actuel'
        }
        value={currentPassword}
        onChange={setCurrentPassword}
        show={showCurrent}
        setShow={setShowCurrent}
      />
      <PasswordField
        label={
          locale === 'en'
            ? 'New password'
            : locale === 'ar'
              ? 'كلمة المرور الجديدة'
              : 'Nouveau mot de passe'
        }
        value={newPassword}
        onChange={setNewPassword}
        show={showNew}
        setShow={setShowNew}
        placeholder="••••••••"
      />
      <PasswordRequirements password={newPassword} />
      <PasswordField
        label={
          locale === 'en'
            ? 'Confirm password'
            : locale === 'ar'
              ? 'تأكيد كلمة المرور'
              : 'Confirmer le mot de passe'
        }
        value={confirmPassword}
        onChange={setConfirmPassword}
        show={showNew}
        setShow={setShowNew}
      />
      {error && <InlineBanner kind="error" message={error} />}
      {success && (
        <InlineBanner
          kind="success"
          message={
            locale === 'en'
              ? 'Password updated. Redirecting...'
              : locale === 'ar'
                ? 'تم تحديث كلمة المرور. جارٍ إعادة التوجيه...'
                : 'Mot de passe mis à jour. Redirection...'
          }
        />
      )}
      <SubmitButton onClick={handleSubmit} disabled={submitting} loading={submitting}>
        {locale === 'en'
          ? 'Update password'
          : locale === 'ar'
            ? 'تحديث كلمة المرور'
            : 'Mettre à jour le mot de passe'}
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
  const { locale } = useI18n();
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
      setError(
        locale === 'en'
          ? 'Enter a valid phone number'
          : locale === 'ar'
            ? 'أدخل رقم هاتف صالحًا'
            : 'Entrez un numéro de téléphone valide',
      );
      return;
    }

    setRequestLoading(true);
    try {
      await dispatch(requestPhoneLink({ phone })).unwrap();
      setCodeVisible(true);
      setInfo(
        locale === 'en'
          ? 'Code sent by SMS.'
          : locale === 'ar'
            ? 'تم إرسال الرمز عبر رسالة نصية.'
            : 'Code envoyé par SMS.',
      );
    } catch {
      // Most common case right now: 403 phone_link_not_allowed, since this is only
      // reachable for social (Google/LinkedIn) accounts.
      setError(
        locale === 'en'
          ? 'Failed to send the code — phone linking is only available for Google/LinkedIn accounts.'
          : locale === 'ar'
            ? 'فشل إرسال الرمز — ربط الهاتف متاح فقط لحسابات Google/LinkedIn.'
            : "Échec de l'envoi du code — le lien de téléphone n'est disponible que pour les comptes Google/LinkedIn.",
      );
    } finally {
      setRequestLoading(false);
    }
  };

  const handleConfirmCode = async () => {
    setError(null);
    setInfo(null);
    if (!code.trim()) {
      setError(
        locale === 'en'
          ? 'Enter the verification code'
          : locale === 'ar'
            ? 'أدخل رمز التحقق'
            : 'Entrez le code de vérification',
      );
      return;
    }

    setConfirmLoading(true);
    try {
      await dispatch(confirmPhoneLink({ phone, code: code.trim() })).unwrap();
      setCode('');
      setCodeVisible(false);
      setInfo(
        locale === 'en'
          ? 'Phone number confirmed successfully.'
          : locale === 'ar'
            ? 'تم تأكيد رقم الهاتف بنجاح.'
            : 'Numéro de téléphone confirmé avec succès.',
      );
    } catch {
      setError(
        locale === 'en'
          ? 'Failed to confirm the number'
          : locale === 'ar'
            ? 'فشل تأكيد الرقم'
            : 'Échec de la confirmation du numéro',
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <SettingsCard
      icon={<Phone size={18} color="#61BCA6" />}
      iconBackground="#E8F7F3"
      title={
        locale === 'en'
          ? 'Link a phone number'
          : locale === 'ar'
            ? 'ربط رقم هاتف'
            : 'Lier un numéro de téléphone'
      }
      description={
        locale === 'en'
          ? `Current: ${user?.phone ?? '-'} (Google/LinkedIn accounts only)`
          : locale === 'ar'
            ? `الحالي: ${user?.phone ?? '-'} (حسابات Google/LinkedIn فقط)`
            : `Actuel : ${user?.phone ?? '-'} (réservé aux comptes Google/LinkedIn)`
      }
    >
      <div>
        <label style={{ fontSize: '12px', color: '#7F8A9A', fontWeight: 700 }}>
          {locale === 'en'
            ? 'Phone number'
            : locale === 'ar'
              ? 'رقم الهاتف'
              : 'Numéro de téléphone'}
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
        {locale === 'en' ? 'Send code' : locale === 'ar' ? 'إرسال الرمز' : 'Envoyer le code'}
      </SubmitButton>

      {codeVisible && (
        <>
          <TextField
            label={
              locale === 'en'
                ? 'Verification code'
                : locale === 'ar'
                  ? 'رمز التحقق'
                  : 'Code de vérification'
            }
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
          />
          <SubmitButton
            onClick={handleConfirmCode}
            disabled={confirmLoading}
            loading={confirmLoading}
          >
            {locale === 'en'
              ? 'Confirm number'
              : locale === 'ar'
                ? 'تأكيد الرقم'
                : 'Confirmer le numéro'}
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
  const { locale } = useI18n();
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
        locale === 'en'
          ? 'Verification is taking longer than expected. Come back to this page in a few minutes to see the result.'
          : locale === 'ar'
            ? 'يستغرق التحقق وقتًا أطول من المتوقع. عد إلى هذه الصفحة بعد بضع دقائق لرؤية النتيجة.'
            : 'La vérification prend plus de temps que prévu. Revenez sur cette page dans quelques minutes pour voir le résultat.',
      );
      return;
    }

    const timer = window.setTimeout(() => {
      pollAttemptsRef.current += 1;
      dispatch(fetchIdentityVerificationStatus(job.id));
    }, POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [job, dispatch, locale]);

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
        title={
          locale === 'en'
            ? 'Identity verified'
            : locale === 'ar'
              ? 'تم التحقق من الهوية'
              : 'Identité vérifiée'
        }
        description={
          locale === 'en'
            ? 'Your selfie matches your profile photo.'
            : locale === 'ar'
              ? 'صورتك الشخصية مطابقة لصورة ملفك الشخصي.'
              : 'Votre selfie correspond à votre photo de profil.'
        }
      >
        <InlineBanner
          kind="success"
          message={
            locale === 'en'
              ? 'Identity verified ✓'
              : locale === 'ar'
                ? 'تم التحقق من الهوية ✓'
                : 'Identité vérifiée ✓'
          }
        />
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
      title={
        locale === 'en'
          ? 'Verify my identity'
          : locale === 'ar'
            ? 'التحقق من هويتي'
            : 'Vérifier mon identité'
      }
      description={
        locale === 'en'
          ? 'Take a selfie to compare it against your profile photo.'
          : locale === 'ar'
            ? 'التقط صورة شخصية لمقارنتها بصورة ملفك الشخصي.'
            : 'Prenez un selfie pour le comparer à votre photo de profil.'
      }
    >
      {restored && !isPending && !failed && (
        <IdentityVerificationCamera onCapture={handleCapture} disabled={submitting} />
      )}

      {(!restored || isPending) && (
        <p style={{ fontSize: '13px', color: '#687284', fontWeight: 600 }}>
          {restored
            ? locale === 'en'
              ? 'Verification in progress...'
              : locale === 'ar'
                ? 'التحقق جارٍ...'
                : 'Vérification en cours...'
            : locale === 'en'
              ? 'Loading...'
              : locale === 'ar'
                ? 'جارٍ التحميل...'
                : 'Chargement...'}
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
                ? locale === 'en'
                  ? 'No face was detected. Face the camera in a well-lit area, without sunglasses or a mask.'
                  : locale === 'ar'
                    ? 'لم يتم اكتشاف أي وجه. واجه الكاميرا في مكان مضاء جيدًا، دون نظارات شمسية أو قناع.'
                    : "Aucun visage n'a été détecté. Placez-vous face à la caméra, dans un endroit bien éclairé, sans lunettes de soleil ni masque."
                : locale === 'en'
                  ? 'Verification failed — the selfie does not match your profile photo.'
                  : locale === 'ar'
                    ? 'فشل التحقق — الصورة الشخصية لا تطابق صورة ملفك الشخصي.'
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
            {locale === 'en' ? 'Retry' : locale === 'ar' ? 'إعادة المحاولة' : 'Réessayer'}
          </button>
        </>
      )}
    </SettingsCard>
  );
}

export function DeleteAccountSection() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { locale } = useI18n();
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
          ? locale === 'en'
            ? 'Could not send the code. Please try again.'
            : locale === 'ar'
              ? 'تعذر إرسال الرمز. حاول مرة أخرى.'
              : "Impossible d'envoyer le code. Réessayez."
          : locale === 'en'
            ? 'Add a phone number to your account before deleting it.'
            : locale === 'ar'
              ? 'أضف رقم هاتف إلى حسابك قبل حذفه.'
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
          ? locale === 'en'
            ? 'Deletion failed. Check your password.'
            : locale === 'ar'
              ? 'فشل الحذف. تحقق من كلمة مرورك.'
              : 'Échec de la suppression. Vérifiez votre mot de passe.'
          : locale === 'en'
            ? 'Deletion failed. Check the OTP code.'
            : locale === 'ar'
              ? 'فشل الحذف. تحقق من رمز التحقق.'
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
      title={
        locale === 'en' ? 'Delete account' : locale === 'ar' ? 'حذف الحساب' : 'Supprimer le compte'
      }
      description={
        hasPassword
          ? locale === 'en'
            ? 'Irreversible action. Confirm with your password.'
            : locale === 'ar'
              ? 'إجراء لا رجعة فيه. أكّد باستخدام كلمة مرورك.'
              : 'Action irréversible. Confirmez avec votre mot de passe.'
          : locale === 'en'
            ? 'Irreversible action. An SMS code is required (accounts without a password).'
            : locale === 'ar'
              ? 'إجراء لا رجعة فيه. رمز الرسائل القصيرة مطلوب (الحسابات بدون كلمة مرور).'
              : 'Action irréversible. Un code SMS est requis (comptes sans mot de passe).'
      }
    >
      {hasPassword ? (
        <TextField
          label={locale === 'en' ? 'Password' : locale === 'ar' ? 'كلمة المرور' : 'Mot de passe'}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      ) : (
        <>
          <TextField
            label={locale === 'en' ? 'OTP code' : locale === 'ar' ? 'رمز التحقق' : 'Code OTP'}
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
            {otpSent
              ? locale === 'en'
                ? 'Resend code'
                : locale === 'ar'
                  ? 'إعادة إرسال الرمز'
                  : 'Renvoyer le code'
              : locale === 'en'
                ? 'Send SMS code'
                : locale === 'ar'
                  ? 'إرسال رمز الرسائل القصيرة'
                  : 'Envoyer le code SMS'}
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
          {locale === 'en'
            ? 'Delete my account'
            : locale === 'ar'
              ? 'حذف حسابي'
              : 'Supprimer mon compte'}
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
            {locale === 'en' ? 'Cancel' : locale === 'ar' ? 'إلغاء' : 'Annuler'}
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
            {submitting
              ? locale === 'en'
                ? 'Deleting...'
                : locale === 'ar'
                  ? 'جارٍ الحذف...'
                  : 'Suppression...'
              : locale === 'en'
                ? 'Confirm deletion'
                : locale === 'ar'
                  ? 'تأكيد الحذف'
                  : 'Confirmer la suppression'}
          </button>
        </div>
      )}
    </SettingsCard>
  );
}

export function AccountSettings() {
  const { locale } = useI18n();
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
          {locale === 'en' ? '← Back' : locale === 'ar' ? '→ رجوع' : '← Retour'}
        </Link>
        <h1 className="ml-4" style={{ fontSize: '16px', fontWeight: 800, color: '#253044' }}>
          {locale === 'en' ? 'My account' : locale === 'ar' ? 'حسابي' : 'Mon compte'}
        </h1>
      </div>

      <div className="w-full space-y-3 px-4 py-6 md:px-8">
        <ChangePasswordSection />
        <PhoneLinkSection />
        <IdentityVerificationSection />
        <DeleteAccountSection />
      </div>
    </div>
  );
}
