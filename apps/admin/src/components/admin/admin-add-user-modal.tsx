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
  AdminEducationEntry,
  AdminExperienceEntry,
  AdminManagedUser,
} from '@/features/admin-users/types';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  Camera,
  Check,
  Clock,
  Copy,
  ExternalLink,
  GraduationCap,
  KeyRound,
  Languages as LanguagesIcon,
  Layers,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
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

const selectClassName =
  'w-full cursor-pointer rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#2F76BB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F76BB]/20 transition-all';

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

const emptyExperience = (): AdminExperienceEntry => ({
  id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title: '',
  company: '',
  type: '',
  startDate: '',
  endDate: '',
  current: false,
});

const emptyEducation = (): AdminEducationEntry => ({
  id: `edu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  school: '',
  degree: '',
  field: '',
  startDate: '',
  endDate: '',
  result: '',
});

const initialForm = {
  name: '',
  phone: '',
  password: '',
  email: '',
  plan: 'FREE' as AdminManagedUser['plan'],
  profileType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'PROVIDER',
  job: '',
  bio: '',
  city: '',
  offerService: false,
  serviceType: '',
  price: '',
  interests: [] as string[],
  selectedGoals: [] as string[],
  availabilityDays: [] as string[],
  availabilityHours: [] as string[],
  contactModes: [] as string[],
  languages: ['Français', 'Arabe'],
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

  const [form, setForm] = useState(initialForm);
  const [authMode, setAuthMode] = useState<'activation_link' | 'manual_password'>('activation_link');
  const [createdResult, setCreatedResult] = useState<AdminCreateUserResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [interestInput, setInterestInput] = useState('');
  const [experiences, setExperiences] = useState<AdminExperienceEntry[]>([]);
  const [educations, setEducations] = useState<AdminEducationEntry[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const set = <K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetAndClose = () => {
    setForm(initialForm);
    setAuthMode('activation_link');
    setCreatedResult(null);
    setCopiedLink(false);
    setCopiedMessage(false);
    setImage(null);
    setInterestInput('');
    setExperiences([]);
    setEducations([]);
    setFormError(null);
    onClose();
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

  const handleSubmit = async () => {
    setFormError(null);

    if (!form.name.trim() || !form.phone.trim()) {
      setFormError('Le nom et le téléphone sont obligatoires.');
      return;
    }
    if (authMode === 'manual_password' && !form.password) {
      setFormError('Le mot de passe est obligatoire en mode manuel.');
      return;
    }
    if (form.profileType === 'INDIVIDUAL' && !form.job.trim()) {
      setFormError('Le métier est obligatoire pour un profil "J’offre".');
      return;
    }
    if (form.interests.length === 0) {
      setFormError('Ajoutez au moins un centre d’intérêt.');
      return;
    }
    if (form.selectedGoals.length === 0) {
      setFormError('Sélectionnez au moins un objectif.');
      return;
    }
    if (form.offerService && (!form.serviceType.trim() || !form.price.trim())) {
      setFormError(
        'Le type de service et le tarif sont obligatoires si l’utilisateur propose un service.',
      );
      return;
    }

    const input: AdminCreateUserInput = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      password: authMode === 'manual_password' ? form.password : undefined,
      email: form.email.trim() || undefined,
      plan: form.plan,
      profileType: form.profileType,
      job: form.job.trim() || undefined,
      bio: form.bio.trim() || undefined,
      image: image ?? undefined,
      city: form.city.trim() || undefined,
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
      experiences: experiences.length > 0 ? experiences : undefined,
      educations: educations.length > 0 ? educations : undefined,
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
    const shareMessage = `Bonjour ${createdResult.user.name}, votre profil ${createdResult.user.job ? `(${createdResult.user.job}) ` : ''}sur Matchy+ a été préparé ! Activez votre compte et définissez votre mot de passe ici : ${activationLink}`;

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
                  className="flex-1 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-mono select-all outline-none"
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
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Message SMS d&apos;invitation
              </label>
              <textarea
                readOnly
                rows={3}
                value={shareMessage}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-xs outline-none select-all resize-none leading-relaxed text-slate-800"
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
                {cleanPhone && (
                  <a
                    href={`sms:${cleanPhone}?body=${encodeURIComponent(shareMessage)}`}
                    className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 shadow-xs"
                    style={{ background: '#2F76BB' }}
                  >
                    <MessageSquare size={13} />
                    Envoyer par SMS
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
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

  // MAIN FORM MODAL
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="animate-in fade-in zoom-in flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2F76BB] shadow-xs">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Ajouter un utilisateur</h3>
              <p className="text-xs text-slate-500">
                Pré-enregistrement d&apos;un contact ou création manuelle d&apos;un compte
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

        {/* Scrollable Form Body */}
        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto bg-slate-50/40 p-6">
          {formError && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs font-medium text-red-700 shadow-xs">
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Identité & Coordonnées */}
          <FormSection
            icon={User}
            title="Identité & Accès"
            subtitle="Informations obligatoires pour le compte et mode d'invitation"
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

            {/* Basic Info Grid */}
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

              <Field label="Email (optionnel)" htmlFor="new-user-email">
                <input
                  id="new-user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => set('email', event.target.value)}
                  className={inputClassName}
                  placeholder="contact@exemple.com"
                />
              </Field>

              <Field label="Ville" htmlFor="new-user-city">
                <input
                  id="new-user-city"
                  value={form.city}
                  onChange={(event) => set('city', event.target.value)}
                  className={inputClassName}
                  placeholder="Tunis, Sousse, Sfax..."
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

          {/* Section 2: Profil & Rôle */}
          <FormSection
            icon={Briefcase}
            title="Profil & Positionnement"
            subtitle="Type de compte, métier, abonnement et présentation"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Type de profil" htmlFor="new-user-profile-type">
                <select
                  id="new-user-profile-type"
                  value={form.profileType}
                  onChange={(event) =>
                    set('profileType', event.target.value as typeof form.profileType)
                  }
                  className={selectClassName}
                >
                  <option value="INDIVIDUAL">J’offre (propose un service)</option>
                  <option value="PROVIDER">Je cherche (recherche un service)</option>
                </select>
              </Field>

              <Field label="Forfait" htmlFor="new-user-plan">
                <select
                  id="new-user-plan"
                  value={form.plan}
                  onChange={(event) => set('plan', event.target.value as typeof form.plan)}
                  className={selectClassName}
                >
                  <option value="FREE">Gratuit</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="PREMIUM_PLUS">Premium+</option>
                </select>
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
                  <select
                    id="new-user-experience"
                    value={form.experience}
                    onChange={(event) => set('experience', event.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Sélectionner…</option>
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Secteur d’activité" htmlFor="new-user-sector">
                <select
                  id="new-user-sector"
                  value={form.sector}
                  onChange={(event) => set('sector', event.target.value)}
                  className={selectClassName}
                >
                  <option value="">Sélectionner…</option>
                  {SECTOR_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Niveau d’études" htmlFor="new-user-education">
                <select
                  id="new-user-education"
                  value={form.educationLevel}
                  onChange={(event) => set('educationLevel', event.target.value)}
                  className={selectClassName}
                >
                  <option value="">Sélectionner…</option>
                  {EDUCATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
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

          {/* Section 3: Offre de service & Tarif */}
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
                    <select
                      id="new-user-service-type"
                      value={form.serviceType}
                      onChange={(event) => set('serviceType', event.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Sélectionner…</option>
                      {SERVICE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
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

          {/* Section 4: Centres d’intérêt & Objectifs */}
          <FormSection
            icon={Sparkles}
            title="Centres d’intérêt & Objectifs"
            subtitle="Critères de matching pour les recommandations de profils"
          >
            {/* Interests */}
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

            {/* Goals */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                Objectifs <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {GOAL_CATEGORIES.map((category) => (
                  <div key={category.label} className="rounded-xl bg-[#F8FAFC] p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2">
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
            </div>
          </FormSection>

          {/* Section 5: Disponibilités & Contact */}
          <FormSection
            icon={Calendar}
            title="Disponibilités & Contact"
            subtitle="Créneaux horaires, jours disponibles et préférences de contact"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  Modes de contact
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

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  Langues parlées
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((language) => (
                    <TogglePill
                      key={language.value}
                      label={language.label}
                      active={form.languages.includes(language.value)}
                      onClick={() => set('languages', toggleInList(form.languages, language.value))}
                    />
                  ))}
                </div>
              </div>
            </div>
          </FormSection>

          {/* Section 6: Expériences professionnelles (optionnel) */}
          <FormSection
            icon={Briefcase}
            title="Expériences professionnelles"
            subtitle="Historique des postes et entreprises"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">
                {experiences.length === 0 ? 'Aucune expérience renseignée' : `${experiences.length} expérience(s)`}
              </span>
              <button
                type="button"
                onClick={() => setExperiences((prev) => [...prev, emptyExperience()])}
                className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#2F76BB] hover:bg-blue-100 transition"
              >
                <Plus size={13} /> Ajouter une expérience
              </button>
            </div>

            <div className="space-y-3">
              {experiences.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-3.5 space-y-2.5 shadow-2xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      placeholder="Intitulé du poste *"
                      value={entry.title}
                      onChange={(event) =>
                        setExperiences((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, title: event.target.value } : item,
                          ),
                        )
                      }
                      className={inputClassName}
                    />
                    <input
                      placeholder="Entreprise"
                      value={entry.company}
                      onChange={(event) =>
                        setExperiences((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, company: event.target.value } : item,
                          ),
                        )
                      }
                      className={inputClassName}
                    />
                    <input
                      placeholder="Type de contrat (CDI, Freelance...)"
                      value={entry.type}
                      onChange={(event) =>
                        setExperiences((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, type: event.target.value } : item,
                          ),
                        )
                      }
                      className={inputClassName}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1">Date début</span>
                      <input
                        type="month"
                        value={entry.startDate}
                        onChange={(event) =>
                          setExperiences((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, startDate: event.target.value } : item,
                            ),
                          )
                        }
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1">Date fin</span>
                      <input
                        type="month"
                        value={entry.endDate}
                        disabled={entry.current}
                        onChange={(event) =>
                          setExperiences((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, endDate: event.target.value } : item,
                            ),
                          )
                        }
                        className={`${inputClassName} disabled:opacity-50`}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4 sm:pt-3">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={entry.current}
                          onChange={(event) =>
                            setExperiences((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      current: event.target.checked,
                                      endDate: event.target.checked ? '' : item.endDate,
                                    }
                                  : item,
                              ),
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300 text-[#2F76BB]"
                        />
                        Poste actuel
                      </label>
                      <button
                        type="button"
                        onClick={() => setExperiences((prev) => prev.filter((_, i) => i !== index))}
                        aria-label="Supprimer cette expérience"
                        className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 transition"
                      >
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Section 7: Formations & Diplômes (optionnel) */}
          <FormSection
            icon={GraduationCap}
            title="Formations & Diplômes"
            subtitle="Parcours académique, écoles et diplômes"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">
                {educations.length === 0 ? 'Aucune formation renseignée' : `${educations.length} formation(s)`}
              </span>
              <button
                type="button"
                onClick={() => setEducations((prev) => [...prev, emptyEducation()])}
                className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#2F76BB] hover:bg-blue-100 transition"
              >
                <Plus size={13} /> Ajouter une formation
              </button>
            </div>

            <div className="space-y-3">
              {educations.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-3.5 space-y-2.5 shadow-2xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      placeholder="École / Établissement *"
                      value={entry.school}
                      onChange={(event) =>
                        setEducations((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, school: event.target.value } : item,
                          ),
                        )
                      }
                      className={inputClassName}
                    />
                    <input
                      placeholder="Diplôme"
                      value={entry.degree}
                      onChange={(event) =>
                        setEducations((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, degree: event.target.value } : item,
                          ),
                        )
                      }
                      className={inputClassName}
                    />
                    <input
                      placeholder="Domaine d’études"
                      value={entry.field}
                      onChange={(event) =>
                        setEducations((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, field: event.target.value } : item,
                          ),
                        )
                      }
                      className={inputClassName}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1">Date début</span>
                      <input
                        type="month"
                        value={entry.startDate}
                        onChange={(event) =>
                          setEducations((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, startDate: event.target.value } : item,
                            ),
                          )
                        }
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1">Date fin</span>
                      <input
                        type="month"
                        value={entry.endDate}
                        onChange={(event) =>
                          setEducations((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, endDate: event.target.value } : item,
                            ),
                          )
                        }
                        className={inputClassName}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4 sm:pt-3">
                      <input
                        placeholder="Mention / résultat"
                        value={entry.result}
                        onChange={(event) =>
                          setEducations((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, result: event.target.value } : item,
                            ),
                          )
                        }
                        className={inputClassName}
                      />
                      <button
                        type="button"
                        onClick={() => setEducations((prev) => prev.filter((_, i) => i !== index))}
                        aria-label="Supprimer cette formation"
                        className="ml-2 flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 transition"
                      >
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
        </div>

        {/* Sticky Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Annuler
          </button>
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
        </div>
      </div>
    </div>
  );
}
