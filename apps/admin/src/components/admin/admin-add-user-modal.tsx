'use client';

import {
  AVAILABILITY_DAYS,
  AVAILABILITY_HOURS,
  CONTACT_MODES,
  EDUCATION_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_CATEGORIES,
  INTERESTS_SUGGESTIONS,
  LANGUAGES,
  MAX_INTERESTS,
  PROFILE_PHOTO_ACCEPT,
  PROFILE_PHOTO_MAX_BYTES,
  SECTOR_OPTIONS,
  SERVICE_TYPES,
  isAllowedProfilePhoto,
} from '@/features/admin-users/create-user-options';
import { createAdminUser, selectAdminUsers } from '@/features/admin-users/store/admin-users-slice';
import type {
  AdminCreateUserInput,
  AdminCreateUserResult,
  AdminManagedUser,
} from '@/features/admin-users/types';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { adminApi } from '@/lib/admin-api';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  KeyRound,
  Layers,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#2F76BB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F76BB]/20 transition-all';

function SelectDropdown({
  id,
  value,
  onChange,
  children,
  required,
}: {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-[#F8FAFC] pl-3.5 pr-9 py-2.5 text-xs font-medium text-slate-800 transition-all focus:border-[#2F76BB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F76BB]/20"
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#2F76BB]">
            <Icon size={15} />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">{title}</h4>
            {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <label htmlFor={htmlFor} className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          {label}
        </label>
        {required && <span className="text-xs font-bold text-red-500">*</span>}
      </div>
      {children}
    </div>
  );
}

function TogglePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? 'bg-[#2F76BB] text-white shadow-xs'
          : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800'
      }`}
    >
      {active && <Check size={12} strokeWidth={2.5} />}
      {label}
    </button>
  );
}

function toggleInList<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

const WIZARD_STEPS = [
  { step: 1, title: 'Identité & Rôle', subtitle: 'Photo, nom, téléphone et profil' },
  { step: 2, title: 'Intérêts & Objectifs', subtitle: 'Centres d’intérêt et prestation' },
  { step: 3, title: 'Disponibilités & Contact', subtitle: 'Jours, horaires, modes et langues' },
] as const;

const initialForm = {
  name: '',
  phone: '',
  password: '',
  plan: 'FREE' as AdminManagedUser['plan'],
  profileType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'PROVIDER',
  job: '',
  bio: '',
  offerService: false,
  serviceType: '',
  price: '',
  interests: [] as string[],
  selectedGoals: [] as string[],
  availabilityDays: [] as string[],
  availabilityHours: [] as string[],
  contactModes: [] as string[],
  languages: ['fr', 'ar'] as string[],
  experience: '',
  sector: '',
  educationLevel: '',
};

interface AdminAddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function AdminAddUserModal({ isOpen, onClose, onCreated }: AdminAddUserModalProps) {
  const dispatch = useAppDispatch();
  const { creatingUser } = useAppSelector(selectAdminUsers);

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState(initialForm);
  const [authMode, setAuthMode] = useState<'activation_link' | 'manual_password'>('activation_link');
  const [createdResult, setCreatedResult] = useState<AdminCreateUserResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsSentSuccess, setSmsSentSuccess] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [interestInput, setInterestInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const set = <K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetAndClose = () => {
    setActiveStep(1);
    setForm(initialForm);
    setAuthMode('activation_link');
    setCreatedResult(null);
    setCopiedLink(false);
    setCopiedMessage(false);
    setCustomMessage(null);
    setSendingSms(false);
    setSmsSentSuccess(false);
    setSmsError(null);
    setImage(null);
    setInterestInput('');
    setFormError(null);
    onClose();
  };

  const handleSendSms = async (message: string, link: string) => {
    if (!createdResult?.user?.id) return;
    setSendingSms(true);
    setSmsError(null);
    try {
      await adminApi.post(`/admin/users/${createdResult.user.id}/send-activation-sms`, {
        message,
        activationLink: link,
      });
      setSmsSentSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setSmsError(
        axiosErr.response?.data?.message ||
          "Échec de l'envoi du SMS via TunisieSMS. Veuillez vérifier le crédit ou le numéro.",
      );
    } finally {
      setSendingSms(false);
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!isAllowedProfilePhoto(file)) {
      setFormError('Format de photo non supporté (JPEG, PNG ou WEBP uniquement).');
      return;
    }
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setFormError('La photo dépasse la taille maximale de 8 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const addInterest = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || form.interests.length >= MAX_INTERESTS || form.interests.includes(trimmed)) {
      return;
    }
    set('interests', [...form.interests, trimmed]);
    setInterestInput('');
  };

  const validateStep1 = (): boolean => {
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError('Le nom et le téléphone sont obligatoires.');
      return false;
    }
    if (authMode === 'manual_password' && !form.password) {
      setFormError('Le mot de passe est obligatoire en mode manuel.');
      return false;
    }
    if (form.profileType === 'INDIVIDUAL' && !form.job.trim()) {
      setFormError('Le métier est obligatoire pour un profil "J’offre".');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (form.interests.length === 0) {
      setFormError('Ajoutez au moins un centre d’intérêt.');
      return false;
    }
    if (form.selectedGoals.length === 0) {
      setFormError('Sélectionnez au moins un objectif.');
      return false;
    }
    if (form.offerService && (!form.serviceType.trim() || !form.price.trim())) {
      setFormError(
        'Le type de service et le tarif sont obligatoires si l’utilisateur propose un service.',
      );
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setFormError(null);
    if (activeStep === 1) {
      if (!validateStep1()) return;
      setActiveStep(2);
    } else if (activeStep === 2) {
      if (!validateStep2()) return;
      setActiveStep(3);
    }
  };

  const handlePrevStep = () => {
    setFormError(null);
    if (activeStep > 1) {
      setActiveStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleStepClick = (target: 1 | 2 | 3) => {
    setFormError(null);
    if (target === activeStep) return;
    if (target > activeStep) {
      if (activeStep === 1 && !validateStep1()) return;
      if (activeStep === 2 && !validateStep2()) return;
      if (target === 3 && activeStep === 1) {
        if (!validateStep1() || !validateStep2()) return;
      }
    }
    setActiveStep(target);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!validateStep1()) {
      setActiveStep(1);
      return;
    }
    if (!validateStep2()) {
      setActiveStep(2);
      return;
    }

    const input: AdminCreateUserInput = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      password: authMode === 'manual_password' ? form.password : undefined,
      email: undefined,
      city: undefined,
      plan: form.plan,
      profileType: form.profileType,
      job: form.job.trim() || undefined,
      bio: form.bio.trim() || undefined,
      image: image ?? undefined,
      offerService: form.offerService,
      serviceType: form.offerService ? form.serviceType.trim() : undefined,
      price: form.offerService ? form.price.trim() : undefined,
      interests: form.interests,
      selectedGoals: form.selectedGoals,
      availabilityDays: form.availabilityDays,
      availabilityHours: form.availabilityHours,
      contactModes: form.contactModes,
      languages: form.languages,
      experience: form.profileType === 'INDIVIDUAL' ? form.experience || undefined : undefined,
      sector: form.sector || undefined,
      educationLevel: form.educationLevel || undefined,
    };

    const result = await dispatch(createAdminUser(input));
    if (createAdminUser.fulfilled.match(result)) {
      if (result.payload.activationLink) {
        setCreatedResult(result.payload);
      } else {
        onCreated?.();
        resetAndClose();
      }
    } else {
      setFormError((result.payload as string | undefined) ?? "Impossible de créer l'utilisateur.");
    }
  };

  // SUCCESS SCREEN (with SMS invitation link & copy)
  if (createdResult) {
    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
    const rawLink = createdResult.activationLink ?? '';
    const activationLink = rawLink.startsWith('/')
      ? `${appBaseUrl || 'http://localhost:3000'}${rawLink}`
      : rawLink;

    const rawPhone = createdResult.user.phone || form.phone;
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const defaultShareMessage = `Matchy+: Bonjour ${createdResult.user.name}, activez votre compte ici: ${activationLink}`;
    const shareMessage = customMessage !== null ? customMessage : defaultShareMessage;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      >
        <div className="animate-in fade-in zoom-in flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl shadow-xs"
                style={{ background: '#E8F7F3', color: '#61BCA6' }}
              >
                <Check size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Utilisateur pré-enregistré !</h3>
                <p className="text-xs text-slate-500">Le profil a été créé avec succès.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onCreated?.();
                resetAndClose();
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="custom-scrollbar flex flex-col gap-4 overflow-y-auto p-6">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-sm font-semibold text-emerald-800">
                Profil de {createdResult.user.name} ({createdResult.user.phone})
              </p>
              <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                L&apos;utilisateur n&apos;a pas encore de mot de passe. Transmettez-lui ce lien sécurisé par SMS pour qu&apos;il active son profil et définisse ses identifiants.
              </p>
            </div>

            {/* Direct Activation Link */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Lien d&apos;activation
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={activationLink}
                  className="flex-1 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-mono font-medium text-slate-900 select-all outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activationLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white transition shadow-xs"
                  style={{ background: copiedLink ? '#61BCA6' : '#2F76BB' }}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLink ? 'Copié !' : 'Copier'}
                </button>
                <a
                  href={activationLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                  title="Tester le lien dans un nouvel onglet"
                >
                  <ExternalLink size={13} />
                  Tester
                </a>
              </div>
            </div>

            {/* Prepared Message for SMS */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Message SMS d&apos;invitation
                </label>
                <span
                  className="text-[11px] font-medium"
                  style={{
                    color: shareMessage.length <= 160 ? '#64748B' : '#D97706',
                  }}
                >
                  {shareMessage.length} / 160 caractères {shareMessage.length <= 160 ? '(1 SMS)' : `(~${Math.ceil(shareMessage.length / 153)} SMS)`}
                </span>
              </div>
              <textarea
                rows={3}
                value={shareMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-xs outline-none focus:border-[#2F76BB] focus:bg-white resize-none leading-relaxed text-slate-800 transition"
              />
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareMessage);
                    setCopiedMessage(true);
                    setTimeout(() => setCopiedMessage(false), 2000);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                >
                  {copiedMessage ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  {copiedMessage ? 'Message copié !' : 'Copier le message SMS'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSendSms(shareMessage, activationLink)}
                  disabled={sendingSms}
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 shadow-xs disabled:opacity-60"
                  style={{ background: smsSentSuccess ? '#61BCA6' : '#2F76BB' }}
                >
                  {sendingSms ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : smsSentSuccess ? (
                    <Check size={13} strokeWidth={2.5} />
                  ) : (
                    <MessageSquare size={13} />
                  )}
                  {sendingSms
                    ? 'Envoi en cours...'
                    : smsSentSuccess
                      ? 'SMS envoyé avec succès !'
                      : 'Envoyer par SMS'}
                </button>
              </div>

              {smsError && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{smsError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-slate-100 p-4 bg-slate-50/50">
            <button
              type="button"
              onClick={() => {
                onCreated?.();
                resetAndClose();
              }}
              className="rounded-xl px-5 py-2.5 text-xs font-bold text-white transition shadow-xs hover:opacity-95"
              style={{ background: '#2F76BB' }}
            >
              Terminer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN FORM MODAL (WIZARD STEPS)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div className="animate-in fade-in zoom-in flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2F76BB] shadow-xs">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Ajouter un utilisateur</h3>
              <p className="text-xs text-slate-500">
                Formulaire d&apos;inscription identique aux étapes de l&apos;application
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Fermer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div className="grid grid-cols-3 border-b border-slate-100 bg-white">
          {WIZARD_STEPS.map((s) => {
            const isCurrent = activeStep === s.step;
            const isCompleted = activeStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => handleStepClick(s.step as 1 | 2 | 3)}
                className={`flex items-center gap-3 px-5 py-3 text-left transition border-b-2 ${
                  isCurrent
                    ? 'border-[#2F76BB] bg-blue-50/30'
                    : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#2F76BB] text-white shadow-xs ring-4 ring-blue-100'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check size={14} strokeWidth={2.5} /> : s.step}
                </div>
                <div className="hidden sm:block min-w-0">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isCurrent ? 'text-[#2F76BB]' : 'text-slate-400'
                    }`}
                  >
                    Étape {s.step}
                  </p>
                  <p
                    className={`text-xs font-bold truncate ${
                      isCurrent ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {s.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Scrollable Form Body */}
        <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-50/40 p-6">
          {formError && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs font-medium text-red-700 shadow-xs">
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* ================= STEP 1: IDENTITÉ & RÔLE ================= */}
          <div className={activeStep === 1 ? 'space-y-5' : 'hidden'}>
            <FormSection
              icon={User}
              title="Identité & Accès"
              subtitle="Étape 1 sur 3 — Photo, nom, téléphone et coordonnées de compte"
            >
              {/* Avatar upload */}
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-dashed border-slate-200 bg-[#F8FAFC] p-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="Aperçu" className="h-full w-full object-cover" />
                  ) : (
                    <Camera size={26} className="text-slate-300" />
                  )}
                </div>
                <div className="flex flex-col items-center sm:items-start gap-1.5 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-[#2F76BB] hover:bg-blue-100 transition"
                    >
                      <Upload size={13} />
                      {image ? 'Changer la photo' : 'Choisir une photo (optionnel)'}
                    </button>
                    {image && (
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                      >
                        <Trash2 size={13} />
                        Supprimer
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    JPEG, PNG ou WEBP — 8 Mo maximum
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={PROFILE_PHOTO_ACCEPT}
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Field label="Nom complet" htmlFor="new-user-name" required>
                  <input
                    id="new-user-name"
                    value={form.name}
                    onChange={(event) => set('name', event.target.value)}
                    className={inputClassName}
                    placeholder="Ex: Mohamed Ben Salah"
                  />
                </Field>

                <Field label="Téléphone" htmlFor="new-user-phone" required>
                  <input
                    id="new-user-phone"
                    value={form.phone}
                    onChange={(event) => set('phone', event.target.value)}
                    className={inputClassName}
                    placeholder="Ex: 20 123 456"
                  />
                </Field>
              </div>

              {/* Access Mode Selector */}
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-[#F8FAFC] p-3.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Mode d&apos;accès & Mot de passe
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('activation_link')}
                    className={`flex items-start gap-2.5 rounded-xl p-3 text-left transition border ${
                      authMode === 'activation_link'
                        ? 'border-[#2F76BB] bg-white ring-2 ring-[#2F76BB]/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                        authMode === 'activation_link' ? 'bg-[#2F76BB] text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Link2 size={13} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">Lien d&apos;activation</span>
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          Recommandé
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">
                        Lien sécurisé (14 jours). Le membre définira son mot de passe lors de sa première visite.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMode('manual_password')}
                    className={`flex items-start gap-2.5 rounded-xl p-3 text-left transition border ${
                      authMode === 'manual_password'
                        ? 'border-[#2F76BB] bg-white ring-2 ring-[#2F76BB]/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                        authMode === 'manual_password' ? 'bg-[#2F76BB] text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <KeyRound size={13} />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-800">Mot de passe manuel</span>
                      <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">
                        Définir manuellement un mot de passe temporaire à communiquer au membre.
                      </p>
                    </div>
                  </button>
                </div>

                {authMode === 'manual_password' && (
                  <div className="mt-2 border-t border-slate-200/60 pt-2">
                    <Field label="Mot de passe temporaire" htmlFor="new-user-password" required>
                      <input
                        id="new-user-password"
                        type="password"
                        value={form.password}
                        onChange={(event) => set('password', event.target.value)}
                        className={inputClassName}
                        placeholder="Au moins 8 caractères"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection
              icon={Briefcase}
              title="Profil & Métier"
              subtitle="Type de compte, profession, expérience et présentation"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Field label="Type de profil" htmlFor="new-user-profile-type">
                  <SelectDropdown
                    id="new-user-profile-type"
                    value={form.profileType}
                    onChange={(event) =>
                      set('profileType', event.target.value as typeof form.profileType)
                    }
                  >
                    <option value="INDIVIDUAL">J’offre (propose un service)</option>
                    <option value="PROVIDER">Je cherche (recherche un service)</option>
                  </SelectDropdown>
                </Field>

                <Field label="Forfait" htmlFor="new-user-plan">
                  <SelectDropdown
                    id="new-user-plan"
                    value={form.plan}
                    onChange={(event) => set('plan', event.target.value as typeof form.plan)}
                  >
                    <option value="FREE">Gratuit</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="PREMIUM_PLUS">Premium+</option>
                  </SelectDropdown>
                </Field>

                <Field
                  label={form.profileType === 'INDIVIDUAL' ? 'Métier' : 'Métier (optionnel)'}
                  htmlFor="new-user-job"
                  required={form.profileType === 'INDIVIDUAL'}
                >
                  <input
                    id="new-user-job"
                    value={form.job}
                    onChange={(event) => set('job', event.target.value)}
                    className={inputClassName}
                    placeholder="Ex: Plombier, Développeur Web..."
                  />
                </Field>

                {form.profileType === 'INDIVIDUAL' && (
                  <Field label="Expérience globale" htmlFor="new-user-experience">
                    <SelectDropdown
                      id="new-user-experience"
                      value={form.experience}
                      onChange={(event) => set('experience', event.target.value)}
                    >
                      <option value="">Sélectionner…</option>
                      {EXPERIENCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </SelectDropdown>
                  </Field>
                )}

                <Field label="Secteur d’activité" htmlFor="new-user-sector">
                  <SelectDropdown
                    id="new-user-sector"
                    value={form.sector}
                    onChange={(event) => set('sector', event.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {SECTOR_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </SelectDropdown>
                </Field>

                <Field label="Niveau d’études" htmlFor="new-user-education">
                  <SelectDropdown
                    id="new-user-education"
                    value={form.educationLevel}
                    onChange={(event) => set('educationLevel', event.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {EDUCATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </SelectDropdown>
                </Field>
              </div>

              <Field label="Biographie" htmlFor="new-user-bio">
                <textarea
                  id="new-user-bio"
                  value={form.bio}
                  onChange={(event) => set('bio', event.target.value)}
                  className={`${inputClassName} resize-none`}
                  style={{ minHeight: '80px' }}
                  placeholder="Courte présentation de l'utilisateur, expertise, compétences clés..."
                />
              </Field>
            </FormSection>
          </div>

          {/* ================= STEP 2: INTÉRÊTS & OBJECTIFS ================= */}
          <div className={activeStep === 2 ? 'space-y-5' : 'hidden'}>
            <FormSection
              icon={Sparkles}
              title="Centres d’intérêt"
              subtitle="Étape 2 sur 3 — Centres d’intérêt pour le matching (max 5)"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Centres d’intérêt <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {form.interests.length} / {MAX_INTERESTS}
                  </span>
                </div>

                {/* Selected Interests */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.interests.map((interest) => (
                    <span
                      key={interest}
                      className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2F76BB] border border-blue-100 shadow-2xs"
                    >
                      {interest}
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            'interests',
                            form.interests.filter((entry) => entry !== interest),
                          )
                        }
                        className="text-[#2F76BB]/70 hover:text-[#2F76BB]"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                {form.interests.length < MAX_INTERESTS && (
                  <>
                    {/* Suggestions */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {INTERESTS_SUGGESTIONS.filter(
                        (suggestion) => !form.interests.includes(suggestion),
                      )
                        .slice(0, 8)
                        .map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => addInterest(suggestion)}
                            className="rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-[#2F76BB] hover:text-[#2F76BB] transition"
                          >
                            + {suggestion}
                          </button>
                        ))}
                    </div>

                    {/* Custom Interest Input */}
                    <div className="flex gap-2">
                      <input
                        value={interestInput}
                        onChange={(event) => setInterestInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addInterest(interestInput);
                          }
                        }}
                        placeholder="Ajouter un centre d’intérêt personnalisé"
                        className={inputClassName}
                      />
                      <button
                        type="button"
                        onClick={() => addInterest(interestInput)}
                        className="rounded-xl px-4 text-white shadow-xs transition hover:opacity-95"
                        style={{ background: '#2F76BB' }}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </FormSection>

            <FormSection
              icon={Layers}
              title="Offre de service & Tarif"
              subtitle="Prestation spécifique proposée par l'utilisateur"
            >
              <div className="rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-4">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.offerService}
                    onChange={(event) => set('offerService', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2F76BB] focus:ring-[#2F76BB]"
                  />
                  Cet utilisateur propose une prestation ou un service spécifique
                </label>

                {form.offerService && (
                  <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60">
                    <Field label="Type de service" htmlFor="new-user-service-type" required>
                      <SelectDropdown
                        id="new-user-service-type"
                        value={form.serviceType}
                        onChange={(event) => set('serviceType', event.target.value)}
                        required
                      >
                        <option value="">Sélectionner…</option>
                        {SERVICE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </SelectDropdown>
                    </Field>
                    <Field label="Tarif indicatif" htmlFor="new-user-price" required>
                      <input
                        id="new-user-price"
                        value={form.price}
                        onChange={(event) => set('price', event.target.value)}
                        className={inputClassName}
                        placeholder="Ex: 50 DT / heure, Sur devis..."
                      />
                    </Field>
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection
              icon={Briefcase}
              title="Objectifs"
              subtitle="Objectifs recherchés sur la plateforme Matchy+"
            >
              <div className="space-y-3">
                {GOAL_CATEGORIES.map((category) => (
                  <div key={category.label} className="rounded-xl bg-[#F8FAFC] p-3.5 border border-slate-100">
                    <p className="text-xs font-bold text-slate-800 mb-2.5">
                      {category.emoji} {category.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {category.options.map((option) => (
                        <TogglePill
                          key={option}
                          label={option}
                          active={form.selectedGoals.includes(option)}
                          onClick={() =>
                            set('selectedGoals', toggleInList(form.selectedGoals, option))
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>
          </div>

          {/* ================= STEP 3: DISPONIBILITÉS & CONTACT ================= */}
          <div className={activeStep === 3 ? 'space-y-5' : 'hidden'}>
            <FormSection
              icon={Calendar}
              title="Disponibilités & Préférences"
              subtitle="Étape 3 sur 3 — Jours disponibles, créneaux horaires, contact et langues"
            >
              <div className="space-y-5">
                {/* Availability Days */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    Jours de disponibilité
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABILITY_DAYS.map((day) => (
                      <TogglePill
                        key={day.short}
                        label={day.short}
                        active={form.availabilityDays.includes(day.short)}
                        onClick={() =>
                          set('availabilityDays', toggleInList(form.availabilityDays, day.short))
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Availability Hours */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    Créneaux horaires
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABILITY_HOURS.map((slot) => (
                      <TogglePill
                        key={slot.value}
                        label={slot.label}
                        active={form.availabilityHours.includes(slot.value)}
                        onClick={() =>
                          set('availabilityHours', toggleInList(form.availabilityHours, slot.value))
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Contact Modes */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    Modes de contact préférés
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CONTACT_MODES.map((mode) => (
                      <TogglePill
                        key={mode.value}
                        label={mode.label}
                        active={form.contactModes.includes(mode.value)}
                        onClick={() =>
                          set('contactModes', toggleInList(form.contactModes, mode.value))
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    Langues parlées
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => {
                      const active = form.languages.includes(lang.value);
                      return (
                        <button
                          key={lang.value}
                          type="button"
                          onClick={() => set('languages', toggleInList(form.languages, lang.value))}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                            active
                              ? 'bg-[#2F76BB] text-white shadow-xs'
                              : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800'
                          }`}
                        >
                          {active && <Check size={12} strokeWidth={2.5} />}
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </FormSection>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Annuler
          </button>

          <div className="flex items-center gap-2.5">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <ArrowLeft size={14} /> Précédent
              </button>
            )}

            {activeStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95"
                style={{ background: '#2F76BB' }}
              >
                Suivant <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={creatingUser}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
                }}
              >
                <User size={14} />
                {creatingUser ? 'Création…' : "Créer l'utilisateur"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
