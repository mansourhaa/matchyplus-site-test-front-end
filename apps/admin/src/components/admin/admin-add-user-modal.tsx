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
  AdminEducationEntry,
  AdminExperienceEntry,
} from '@/features/admin-users/types';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { Camera, Check, Plus, Trash2, User, X } from 'lucide-react';
import { useRef, useState } from 'react';

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
      className="flex items-center gap-1 rounded-full px-3 py-1.5"
      style={{
        fontSize: '12px',
        fontWeight: 600,
        background: active ? '#2F76BB' : 'white',
        color: active ? 'white' : '#555',
        border: active ? 'none' : '1px solid #E0E0E0',
      }}
    >
      {active && <Check size={11} />}
      {label}
    </button>
  );
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

let entryIdCounter = 0;
function nextEntryId() {
  entryIdCounter += 1;
  return `entry-${entryIdCounter}`;
}

const emptyExperience = (): AdminExperienceEntry => ({
  id: nextEntryId(),
  title: '',
  company: '',
  type: '',
  startDate: '',
  endDate: '',
  current: false,
});

const emptyEducation = (): AdminEducationEntry => ({
  id: nextEntryId(),
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
  plan: 'FREE' as 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS',
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
  languages: [] as string[],
  experience: '',
  sector: '',
  educationLevel: '',
};

export function AdminAddUserModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const dispatch = useAppDispatch();
  const { creatingUser } = useAppSelector(selectAdminUsers);

  const [form, setForm] = useState(initialForm);
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

    if (!form.name.trim() || !form.phone.trim() || !form.password) {
      setFormError('Le nom, le téléphone et le mot de passe sont obligatoires.');
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
      password: form.password,
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
      onCreated?.();
      resetAndClose();
    } else {
      setFormError((result.payload as string | undefined) ?? "Impossible de créer l'utilisateur.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="animate-in fade-in zoom-in flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl duration-200"
        style={{ background: 'white', boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}
      >
        <div
          className="flex shrink-0 items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #F0F0F0' }}
        >
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E' }}>
            Ajouter un utilisateur
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

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
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

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
              style={{ background: '#F5F7FA', border: '1.5px dashed #D0E4F7' }}
              aria-label="Choisir une photo de profil"
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="Aperçu" className="h-full w-full object-cover" />
              ) : (
                <Camera size={20} color="#AAA" />
              )}
            </button>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl px-3 py-1.5"
                style={{
                  background: '#F0F7FF',
                  color: '#2F76BB',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {image ? 'Changer la photo' : 'Choisir une photo (optionnel)'}
              </button>
              <p style={{ fontSize: '11px', color: '#AAA', marginTop: '4px' }}>
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom complet" htmlFor="new-user-name">
              <input
                id="new-user-name"
                value={form.name}
                onChange={(event) => set('name', event.target.value)}
                className="rounded-xl px-3 py-2 outline-none"
                style={inputStyle}
              />
            </Field>
            <Field label="Téléphone" htmlFor="new-user-phone">
              <input
                id="new-user-phone"
                value={form.phone}
                onChange={(event) => set('phone', event.target.value)}
                className="rounded-xl px-3 py-2 outline-none"
                style={inputStyle}
                placeholder="20 123 456"
              />
            </Field>
            <Field label="Mot de passe" htmlFor="new-user-password">
              <input
                id="new-user-password"
                type="password"
                value={form.password}
                onChange={(event) => set('password', event.target.value)}
                className="rounded-xl px-3 py-2 outline-none"
                style={inputStyle}
              />
            </Field>
            <Field label="Email (optionnel)" htmlFor="new-user-email">
              <input
                id="new-user-email"
                type="email"
                value={form.email}
                onChange={(event) => set('email', event.target.value)}
                className="rounded-xl px-3 py-2 outline-none"
                style={inputStyle}
              />
            </Field>
            <Field label="Type de profil" htmlFor="new-user-profile-type">
              <select
                id="new-user-profile-type"
                value={form.profileType}
                onChange={(event) =>
                  set('profileType', event.target.value as typeof form.profileType)
                }
                className="cursor-pointer rounded-xl px-3 py-2 outline-none"
                style={inputStyle}
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
                className="cursor-pointer rounded-xl px-3 py-2 outline-none"
                style={inputStyle}
              >
                <option value="FREE">Gratuit</option>
                <option value="PREMIUM">Premium</option>
                <option value="PREMIUM_PLUS">Premium+</option>
              </select>
            </Field>
            <Field
              label={form.profileType === 'INDIVIDUAL' ? 'Métier' : 'Métier (optionnel)'}
              htmlFor="new-user-job"
            >
              <input
                id="new-user-job"
                value={form.job}
                onChange={(event) => set('job', event.target.value)}
                className="rounded-xl px-3 py-2 outline-none"
                style={inputStyle}
              />
            </Field>
            <Field label="Ville" htmlFor="new-user-city">
              <input
                id="new-user-city"
                value={form.city}
                onChange={(event) => set('city', event.target.value)}
                className="rounded-xl px-3 py-2 outline-none"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Biographie" htmlFor="new-user-bio">
            <textarea
              id="new-user-bio"
              value={form.bio}
              onChange={(event) => set('bio', event.target.value)}
              className="w-full resize-none rounded-xl px-3 py-2.5 outline-none"
              style={{ ...inputStyle, minHeight: '70px' }}
            />
          </Field>

          <div className="rounded-2xl p-4" style={{ background: '#F5F7FA' }}>
            <label
              className="flex items-center gap-2"
              style={{ fontSize: '13px', fontWeight: 600, color: '#353535' }}
            >
              <input
                type="checkbox"
                checked={form.offerService}
                onChange={(event) => set('offerService', event.target.checked)}
              />
              Cet utilisateur propose un service
            </label>
            {form.offerService && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Type de service" htmlFor="new-user-service-type">
                  <select
                    id="new-user-service-type"
                    value={form.serviceType}
                    onChange={(event) => set('serviceType', event.target.value)}
                    className="cursor-pointer rounded-xl px-3 py-2 outline-none"
                    style={inputStyle}
                  >
                    <option value="">Sélectionner…</option>
                    {SERVICE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tarif" htmlFor="new-user-price">
                  <input
                    id="new-user-price"
                    value={form.price}
                    onChange={(event) => set('price', event.target.value)}
                    className="rounded-xl px-3 py-2 outline-none"
                    style={inputStyle}
                    placeholder="50 DT"
                  />
                </Field>
              </div>
            )}
          </div>

          <div>
            <p style={labelStyle}>Centres d’intérêt (max {MAX_INTERESTS})</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {form.interests.map((interest) => (
                <span
                  key={interest}
                  className="flex items-center gap-1 rounded-full px-3 py-1"
                  style={{
                    background: '#EEF5FF',
                    color: '#2F76BB',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
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
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            {form.interests.length < MAX_INTERESTS && (
              <>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {INTERESTS_SUGGESTIONS.filter(
                    (suggestion) => !form.interests.includes(suggestion),
                  )
                    .slice(0, 8)
                    .map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => addInterest(suggestion)}
                        className="rounded-full px-2.5 py-1"
                        style={{ fontSize: '11px', color: '#555', border: '1px dashed #D0D0D0' }}
                      >
                        + {suggestion}
                      </button>
                    ))}
                </div>
                <div className="mt-2 flex gap-2">
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
                    className="flex-1 rounded-xl px-3 py-2 outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => addInterest(interestInput)}
                    className="rounded-xl px-3"
                    style={{ background: '#2F76BB', color: 'white' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </>
            )}
          </div>

          <div>
            <p style={labelStyle}>Objectifs</p>
            <div className="mt-2 space-y-3">
              {GOAL_CATEGORIES.map((category) => (
                <div key={category.label}>
                  <p
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#555',
                      marginBottom: '6px',
                    }}
                  >
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

          <div className="grid grid-cols-2 gap-5">
            <div>
              <p style={labelStyle}>Jours de disponibilité</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
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
              <p style={labelStyle}>Horaires</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
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
              <p style={labelStyle}>Modes de contact</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CONTACT_MODES.map((mode) => (
                  <TogglePill
                    key={mode.value}
                    label={mode.label}
                    active={form.contactModes.includes(mode.value)}
                    onClick={() => set('contactModes', toggleInList(form.contactModes, mode.value))}
                  />
                ))}
              </div>
            </div>
            <div>
              <p style={labelStyle}>Langues</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
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

          <div className="grid grid-cols-3 gap-3">
            {form.profileType === 'INDIVIDUAL' && (
              <Field label="Expérience" htmlFor="new-user-experience">
                <select
                  id="new-user-experience"
                  value={form.experience}
                  onChange={(event) => set('experience', event.target.value)}
                  className="cursor-pointer rounded-xl px-3 py-2 outline-none"
                  style={inputStyle}
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
                className="cursor-pointer rounded-xl px-3 py-2 outline-none"
                style={inputStyle}
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
                className="cursor-pointer rounded-xl px-3 py-2 outline-none"
                style={inputStyle}
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

          <div>
            <div className="flex items-center justify-between">
              <p style={labelStyle}>Expériences professionnelles (optionnel)</p>
              <button
                type="button"
                onClick={() => setExperiences((prev) => [...prev, emptyExperience()])}
                className="flex items-center gap-1 rounded-lg px-2 py-1"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#2F76BB',
                  background: '#F0F7FF',
                }}
              >
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {experiences.map((entry, index) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-6 gap-2 rounded-xl p-2"
                  style={{ background: '#F5F7FA' }}
                >
                  <input
                    placeholder="Intitulé du poste"
                    value={entry.title}
                    onChange={(event) =>
                      setExperiences((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, title: event.target.value } : item,
                        ),
                      )
                    }
                    className="col-span-2 rounded-lg px-2 py-1.5 outline-none"
                    style={{ ...inputStyle, background: 'white' }}
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
                    className="col-span-2 rounded-lg px-2 py-1.5 outline-none"
                    style={{ ...inputStyle, background: 'white' }}
                  />
                  <input
                    placeholder="Type de contrat"
                    value={entry.type}
                    onChange={(event) =>
                      setExperiences((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, type: event.target.value } : item,
                        ),
                      )
                    }
                    className="col-span-2 rounded-lg px-2 py-1.5 outline-none"
                    style={{ ...inputStyle, background: 'white' }}
                  />
                  <input
                    type="month"
                    placeholder="Début"
                    value={entry.startDate}
                    onChange={(event) =>
                      setExperiences((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, startDate: event.target.value } : item,
                        ),
                      )
                    }
                    className="col-span-2 rounded-lg px-2 py-1.5 outline-none"
                    style={{ ...inputStyle, background: 'white' }}
                  />
                  <input
                    type="month"
                    placeholder="Fin"
                    value={entry.endDate}
                    disabled={entry.current}
                    onChange={(event) =>
                      setExperiences((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, endDate: event.target.value } : item,
                        ),
                      )
                    }
                    className="col-span-2 rounded-lg px-2 py-1.5 outline-none disabled:opacity-50"
                    style={{ ...inputStyle, background: 'white' }}
                  />
                  <label
                    className="col-span-3 flex items-center gap-2"
                    style={{ fontSize: '12px', color: '#555' }}
                  >
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
                    />
                    Poste actuel
                  </label>
                  <div className="col-span-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setExperiences((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="Supprimer cette expérience"
                      className="flex items-center gap-1"
                      style={{ fontSize: '11px', color: '#E74C3C' }}
                    >
                      <Trash2 size={14} /> Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p style={labelStyle}>Formations & diplômes (optionnel)</p>
              <button
                type="button"
                onClick={() => setEducations((prev) => [...prev, emptyEducation()])}
                className="flex items-center gap-1 rounded-lg px-2 py-1"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#2F76BB',
                  background: '#F0F7FF',
                }}
              >
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {educations.map((entry, index) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-6 gap-2 rounded-xl p-2"
                  style={{ background: '#F5F7FA' }}
                >
                  <input
                    placeholder="École / Établissement"
                    value={entry.school}
                    onChange={(event) =>
                      setEducations((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, school: event.target.value } : item,
                        ),
                      )
                    }
                    className="col-span-2 rounded-lg px-2 py-1.5 outline-none"
                    style={{ ...inputStyle, background: 'white' }}
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
                    className="col-span-2 rounded-lg px-2 py-1.5 outline-none"
                    style={{ ...inputStyle, background: 'white' }}
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
                    className="col-span-2 rounded-lg px-2 py-1.5 outline-none"
                    style={{ ...inputStyle, background: 'white' }}
                  />
                  <input
                    type="month"
                    placeholder="Début"
                    value={entry.startDate}
                    onChange={(event) =>
                      setEducations((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, startDate: event.target.value } : item,
                        ),
                      )
                    }
                    className="col-span-2 rounded-lg px-2 py-1.5 outline-none"
                    style={{ ...inputStyle, background: 'white' }}
                  />
                  <input
                    type="month"
                    placeholder="Fin"
                    value={entry.endDate}
                    onChange={(event) =>
                      setEducations((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, endDate: event.target.value } : item,
                        ),
                      )
                    }
                    className="col-span-2 rounded-lg px-2 py-1.5 outline-none"
                    style={{ ...inputStyle, background: 'white' }}
                  />
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
                    className="col-span-2 rounded-lg px-2 py-1.5 outline-none"
                    style={{ ...inputStyle, background: 'white' }}
                  />
                  <div className="col-span-6 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setEducations((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="Supprimer cette formation"
                      className="flex items-center gap-1"
                      style={{ fontSize: '11px', color: '#E74C3C' }}
                    >
                      <Trash2 size={14} /> Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-3 px-6 py-4"
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
            disabled={creatingUser}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-white disabled:opacity-60"
            style={{
              background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <User size={15} />
            {creatingUser ? 'Création…' : "Créer l'utilisateur"}
          </button>
        </div>
      </div>
    </div>
  );
}
