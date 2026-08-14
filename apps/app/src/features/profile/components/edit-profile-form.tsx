'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  CONTACT_OPTIONS,
  DAYS,
  EDUCATION_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_CATEGORIES,
  INTERESTS_SUGGESTIONS,
  LANGUAGE_OPTIONS,
  MAX_INTERESTS,
  SECTOR_OPTIONS,
  SERVICE_TYPES,
  TIME_SLOTS,
} from '@/features/onboarding/constants';
import {
  fetchOnboardingProfile,
  patchOnboardingProfile,
  selectOnboarding,
  updateOnboardingProfile,
} from '@/features/onboarding/store/onboarding-slice';
import type {
  OnboardingProfilePatch,
  ProfileEducation,
  ProfileExperience,
} from '@/features/onboarding/types';
import {
  ChoiceEditor,
  EditSheet,
  EducationSection,
  ExperienceSection,
  ProfileCard,
  SectionHeading,
  TagEditor,
} from '@/features/profile/components/profile-edit-sections';
import { humanizeMediaError } from '@/features/profile/media-errors';
import {
  deleteProfilePhoto,
  deleteProfileVideo,
  selectProfile,
  uploadProfilePhoto,
} from '@/features/profile/store/profile-slice';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import {
  Briefcase,
  Camera,
  Check,
  ChevronDown,
  Clock,
  Coffee,
  Globe,
  GraduationCap,
  Heart,
  MessageCircle,
  Pencil,
  Phone,
  Play,
  Plus,
  Star,
  Target,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import Link from 'next/link';
import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Sheet =
  | 'identity'
  | 'bio'
  | 'interests'
  | 'goals'
  | 'contact'
  | 'experience'
  | 'sector'
  | 'education'
  | 'service'
  | 'languages'
  | 'availability'
  | null;

type ProfileSaveOverrides = Partial<{
  name: string;
  job: string;
  bio: string;
  interests: string[];
  goals: string[];
  contactModes: string[];
  offerService: boolean;
  serviceType: string;
  price: string;
  experience: string;
  sector: string;
  education: string;
  experiences: ProfileExperience[];
  educations: ProfileEducation[];
  languages: string[];
  availabilityDays: string[];
  availabilityHours: string[];
}>;

const iconBox = (children: ReactNode, background: string) => (
  <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background }}>
    {children}
  </span>
);

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts.shift() ?? '', lastName: parts.join(' ') };
}

export function EditProfileForm() {
  const dispatch = useAppDispatch();
  const { locale } = useI18n();
  const isRtl = locale === 'ar';
  const { profile, loading, error: profileError } = useAppSelector(selectOnboarding);
  const { mediaUploading, mediaError } = useAppSelector(selectProfile);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [name, setName] = useState('');
  const [job, setJob] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [contactModes, setContactModes] = useState<string[]>([]);
  const [offerService, setOfferService] = useState(false);
  const [serviceType, setServiceType] = useState('');
  const [price, setPrice] = useState('');
  const [experience, setExperience] = useState('');
  const [sector, setSector] = useState('');
  const [education, setEducation] = useState('');
  const [experiences, setExperiences] = useState<ProfileExperience[]>([]);
  const [educations, setEducations] = useState<ProfileEducation[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [availabilityDays, setAvailabilityDays] = useState<string[]>([]);
  const [availabilityHours, setAvailabilityHours] = useState<string[]>([]);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [videoPlaybackError, setVideoPlaybackError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<'photo' | 'video' | null>(null);
  const hydrated = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const serverPhoto = profile?.image ?? null;
  const serverVideo = profile?.video ?? null;
  const photo = useAuthenticatedMediaUrl(serverPhoto);
  const video = useAuthenticatedMediaUrl(serverVideo, { stream: true });

  useEffect(() => {
    dispatch(fetchOnboardingProfile());
  }, [dispatch]);

  useEffect(() => {
    if (!profile || hydrated.current) return;
    hydrated.current = true;
    setName(profile.name ?? '');
    setJob(profile.job ?? '');
    setBio(profile.bio ?? '');
    setInterests(profile.interests ?? []);
    setGoals(profile.selected_goals ?? []);
    setContactModes(profile.contact_modes ?? []);
    setOfferService(profile.offer_service ?? false);
    setServiceType(profile.service_type ?? '');
    setPrice(profile.price ?? '');
    setExperience(profile.experience ?? '');
    setSector(profile.sector ?? '');
    setEducation(profile.education_level ?? '');
    setExperiences(profile.experiences ?? []);
    setEducations(profile.educations ?? []);
    setLanguages(profile.languages ?? []);
    setAvailabilityDays(profile.availability_days ?? []);
    setAvailabilityHours(profile.availability_hours ?? []);
  }, [profile]);

  useEffect(
    () => () => {
      if (localPhoto?.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(localPhoto);
      }
    },
    [localPhoto],
  );

  const imageUrl = localPhoto || photo.url;
  const videoFilename = serverVideo?.split('/').pop() || serverVideo;
  const isIndividual = profile?.profile_type === 'INDIVIDUAL';
  const completion = useMemo(() => {
    const values = [
      name,
      job,
      bio,
      interests.length,
      goals.length,
      serverPhoto,
      sector,
      !offerService || (serviceType && price),
      !isIndividual || (experience && education),
    ];
    return Math.round((values.filter(Boolean).length / values.length) * 100);
  }, [
    bio,
    education,
    experience,
    goals.length,
    interests.length,
    isIndividual,
    job,
    name,
    offerService,
    price,
    sector,
    serverPhoto,
    serviceType,
  ]);

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError(
        locale === 'en'
          ? 'Photo too large (8 MB max).'
          : locale === 'ar'
            ? 'الصورة كبيرة جدًا (8 ميغابايت كحد أقصى).'
            : 'Photo trop volumineuse (8 Mo maximum).',
      );
      return;
    }
    setError(null);
    if (typeof URL.createObjectURL === 'function') {
      const preview = URL.createObjectURL(file);
      setLocalPhoto((previous) => {
        if (previous && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(previous);
        return preview;
      });
    }
    const result = await dispatch(uploadProfilePhoto(file));
    if (uploadProfilePhoto.fulfilled.match(result)) {
      dispatch(patchOnboardingProfile({ image: result.payload.image ?? null }));
      dispatch(fetchOnboardingProfile());
    } else {
      setLocalPhoto(null);
    }
  };

  const removePhoto = async () => {
    setConfirmDelete(null);
    const result = await dispatch(deleteProfilePhoto());
    if (deleteProfilePhoto.fulfilled.match(result)) {
      setLocalPhoto(null);
      dispatch(patchOnboardingProfile({ image: null }));
      dispatch(fetchOnboardingProfile());
    }
  };

  const removeVideo = async () => {
    setConfirmDelete(null);
    setError(null);
    const result = await dispatch(deleteProfileVideo());
    if (deleteProfileVideo.fulfilled.match(result)) {
      setShowVideoPreview(false);
      setVideoPlaybackError(false);
      dispatch(patchOnboardingProfile({ video: null }));
      await dispatch(fetchOnboardingProfile());
    }
  };

  const save = async (overrides: ProfileSaveOverrides = {}): Promise<boolean> => {
    setSaved(false);
    setError(null);
    const draft = {
      name: overrides.name ?? name,
      job: overrides.job ?? job,
      bio: overrides.bio ?? bio,
      interests: overrides.interests ?? interests,
      goals: overrides.goals ?? goals,
      contactModes: overrides.contactModes ?? contactModes,
      offerService: overrides.offerService ?? offerService,
      serviceType: overrides.serviceType ?? serviceType,
      price: overrides.price ?? price,
      experience: overrides.experience ?? experience,
      sector: overrides.sector ?? sector,
      education: overrides.education ?? education,
      experiences: overrides.experiences ?? experiences,
      educations: overrides.educations ?? educations,
      languages: overrides.languages ?? languages,
      availabilityDays: overrides.availabilityDays ?? availabilityDays,
      availabilityHours: overrides.availabilityHours ?? availabilityHours,
    };
    // A sheet save only patches the field(s) it actually edited (see overrideKeys
    // below) — validating fields the user isn't touching in this call would block,
    // say, saving the service type on the fact that availability (a separate sheet,
    // saved separately) isn't filled in yet.
    const overrideKeys = Object.keys(overrides) as (keyof ProfileSaveOverrides)[];
    const touches = (...keys: (keyof ProfileSaveOverrides)[]) =>
      overrideKeys.length === 0 || keys.some((key) => overrideKeys.includes(key));

    if (touches('name') && !draft.name.trim()) {
      setError(
        locale === 'en'
          ? 'Name is required.'
          : locale === 'ar'
            ? 'الاسم مطلوب.'
            : 'Le nom est obligatoire.',
      );
      return false;
    }
    if (touches('interests', 'goals') && (!draft.interests.length || !draft.goals.length)) {
      setError(
        locale === 'en'
          ? 'Add at least one interest and one goal.'
          : locale === 'ar'
            ? 'أضف اهتمامًا واحدًا وهدفًا واحدًا على الأقل.'
            : 'Ajoutez au moins un intérêt et un objectif.',
      );
      return false;
    }
    if (
      touches('serviceType', 'price') &&
      draft.offerService &&
      (!draft.serviceType || !draft.price.trim())
    ) {
      setError(
        locale === 'en'
          ? 'The service type and price are required.'
          : locale === 'ar'
            ? 'نوع الخدمة وسعرها مطلوبان.'
            : 'Le type et le prix du service sont obligatoires.',
      );
      return false;
    }
    if (
      touches('availabilityDays', 'availabilityHours') &&
      draft.offerService &&
      !draft.availabilityDays.length
    ) {
      setError(
        locale === 'en'
          ? 'Select at least one available day.'
          : locale === 'ar'
            ? 'اختر يومًا واحدًا على الأقل من أيام التوفر.'
            : 'Sélectionnez au moins un jour de disponibilité.',
      );
      return false;
    }

    const fullPatch = {
      name: draft.name.trim(),
      job: draft.job.trim(),
      bio: draft.bio.trim(),
      interests: draft.interests,
      selectedGoals: draft.goals,
      contactModes: draft.contactModes,
      offerService: draft.offerService,
      serviceType: draft.offerService ? draft.serviceType : '',
      price: draft.offerService ? draft.price.trim() : '',
      experience: draft.experience,
      sector: draft.sector,
      educationLevel: draft.education,
      experiences: draft.experiences,
      educations: draft.educations,
      languages: draft.languages,
      availabilityDays: draft.offerService ? draft.availabilityDays : [],
      availabilityHours: draft.offerService ? draft.availabilityHours : [],
    };

    // Sheet saves pass a single-field override — only PATCH those keys so the click
    // feels snappy instead of rewriting the entire profile on every Enregistrer.
    let patch: OnboardingProfilePatch = fullPatch;
    if (overrideKeys.length > 0) {
      const partial: Record<string, unknown> = {};
      for (const key of overrideKeys) {
        switch (key) {
          case 'name':
            partial.name = fullPatch.name;
            break;
          case 'job':
            partial.job = fullPatch.job;
            break;
          case 'bio':
            partial.bio = fullPatch.bio;
            break;
          case 'interests':
            partial.interests = fullPatch.interests;
            break;
          case 'goals':
            partial.selectedGoals = fullPatch.selectedGoals;
            break;
          case 'contactModes':
            partial.contactModes = fullPatch.contactModes;
            break;
          case 'offerService':
            partial.offerService = fullPatch.offerService;
            break;
          case 'serviceType':
            partial.serviceType = fullPatch.serviceType;
            break;
          case 'price':
            partial.price = fullPatch.price;
            break;
          case 'experience':
            partial.experience = fullPatch.experience;
            break;
          case 'sector':
            partial.sector = fullPatch.sector;
            break;
          case 'education':
            partial.educationLevel = fullPatch.educationLevel;
            break;
          case 'experiences':
            partial.experiences = fullPatch.experiences;
            break;
          case 'educations':
            partial.educations = fullPatch.educations;
            break;
          case 'languages':
            partial.languages = fullPatch.languages;
            break;
          case 'availabilityDays':
            partial.availabilityDays = fullPatch.availabilityDays;
            break;
          case 'availabilityHours':
            partial.availabilityHours = fullPatch.availabilityHours;
            break;
        }
      }
      patch = partial as OnboardingProfilePatch;
    }

    setSaving(true);
    try {
      // The PATCH response is already the authoritative, fully-updated profile (see
      // updateOnboardingProfile.fulfilled), so a follow-up GET-and-compare would only
      // ever re-check a handful of fields and drift out of sync as fields are added —
      // trust the fulfilled/rejected thunk result directly instead.
      await dispatch(updateOnboardingProfile(patch)).unwrap();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      return true;
    } catch {
      setError(
        locale === 'en'
          ? 'Save failed. Try again.'
          : locale === 'ar'
            ? 'فشل الحفظ. حاول مرة أخرى.'
            : 'Échec de la sauvegarde. Réessayez.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (!profile && loading) {
    return (
      <div className="py-16 text-center text-sm text-[#888]">
        {locale === 'en'
          ? 'Loading profile…'
          : locale === 'ar'
            ? 'جارٍ تحميل الملف الشخصي…'
            : 'Chargement du profil…'}
      </div>
    );
  }
  if (!profile && profileError) {
    return (
      <div className="mx-4 my-10 rounded-2xl bg-white p-6 text-center shadow-sm" role="alert">
        <p className="text-sm text-[#E24E59]">
          {locale === 'en'
            ? 'Could not load your profile.'
            : locale === 'ar'
              ? 'تعذر تحميل ملفك الشخصي.'
              : 'Impossible de charger votre profil.'}
        </p>
        <button
          type="button"
          onClick={() => dispatch(fetchOnboardingProfile())}
          className="mt-4 rounded-xl bg-[#2F76BB] px-5 py-2.5 text-sm font-bold text-white"
        >
          {locale === 'en' ? 'Retry' : locale === 'ar' ? 'إعادة المحاولة' : 'Réessayer'}
        </button>
      </div>
    );
  }

  const profileTypeLabel = isIndividual
    ? locale === 'en'
      ? 'Looking for'
      : locale === 'ar'
        ? 'أبحث عن'
        : 'Je cherche'
    : profile?.profile_type === 'PROVIDER'
      ? locale === 'en'
        ? 'Offering'
        : locale === 'ar'
          ? 'أعرض'
          : 'J’offre'
      : locale === 'en'
        ? 'Profile'
        : locale === 'ar'
          ? 'الملف الشخصي'
          : 'Profil';
  const completionColor = completion >= 80 ? '#61BCA6' : completion >= 50 ? '#2F76BB' : '#F5A623';
  const completionBackground =
    completion >= 80 ? '#E8F7F3' : completion >= 50 ? '#E8F0FA' : '#FFF8EB';

  return (
    <div className="w-full pb-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="mb-3 bg-white pb-5 shadow-sm">
        <div className="h-20 bg-gradient-to-br from-[#1a5fa0] via-[#2F76BB] to-[#61BCA6]" />
        <div className="-mt-10 flex flex-col items-center px-4">
          <div className="relative mb-3">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#D5E6F5] shadow-md">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={
                    locale === 'en'
                      ? 'Profile photo'
                      : locale === 'ar'
                        ? 'صورة الملف الشخصي'
                        : 'Photo de profil'
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={32} color="#2F76BB" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={mediaUploading}
              className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#2F76BB] shadow-md disabled:opacity-60"
              aria-label={
                locale === 'en'
                  ? 'Change profile photo'
                  : locale === 'ar'
                    ? 'تغيير صورة الملف الشخصي'
                    : 'Changer la photo de profil'
              }
            >
              <Camera size={13} color="white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={mediaUploading}
            />
          </div>
          {imageUrl && (
            <button
              type="button"
              onClick={() => setConfirmDelete('photo')}
              disabled={mediaUploading}
              className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-[#E24E59] disabled:opacity-50"
            >
              <Trash2 size={11} />{' '}
              {locale === 'en'
                ? 'Remove photo'
                : locale === 'ar'
                  ? 'حذف الصورة'
                  : 'Supprimer la photo'}
            </button>
          )}
          <span
            className="mb-2 rounded-full border px-3 py-1 text-[11px] font-bold"
            style={{
              color: completionColor,
              borderColor: completionColor,
              background: completionBackground,
            }}
          >
            {locale === 'en'
              ? `${completion}% complete`
              : locale === 'ar'
                ? `مكتمل بنسبة ${completion}%`
                : `Complété à ${completion}%`}
          </span>
          <div className="mb-3 h-1.5 w-full max-w-xs rounded-full bg-[#E8E8E8]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${completion}%`, background: completionColor }}
            />
          </div>
          <span
            className="mb-2 rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{
              background: isIndividual ? '#E8F7F3' : '#FFF3E0',
              color: isIndividual ? '#27AE60' : '#E67E22',
            }}
          >
            {profileTypeLabel}
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-[#353535]">
              {name || (locale === 'en' ? 'Your name' : locale === 'ar' ? 'اسمك' : 'Votre nom')}
            </h1>
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2F76BB]"
              aria-label={
                locale === 'en'
                  ? 'Verified profile'
                  : locale === 'ar'
                    ? 'ملف موثّق'
                    : 'Profil vérifié'
              }
            >
              <Check size={11} color="white" />
            </span>
            <button
              type="button"
              onClick={() => setSheet('identity')}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[#D0E4F7] bg-[#EEF5FF]"
              aria-label={
                locale === 'en'
                  ? 'Edit name and profession'
                  : locale === 'ar'
                    ? 'تعديل الاسم والمهنة'
                    : 'Modifier le nom et la profession'
              }
            >
              <Pencil size={11} color="#2F76BB" />
            </button>
          </div>
          <p className="text-[13px] text-[#777]">
            {job ||
              (locale === 'en'
                ? 'No profession set'
                : locale === 'ar'
                  ? 'لم يتم تحديد المهنة'
                  : 'Profession non renseignée')}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-[#888]">
            <span className="mx-1 text-[#CCC]">·</span>
            <Star size={12} color="#F5A623" fill="#F5A623" />
            {profile?.rating ? profile.rating.toFixed(1) : '—'}
          </div>
          {photo.error && (
            <p className="mt-2 text-xs text-[#E24E59]">
              {locale === 'en'
                ? 'Photo unavailable.'
                : locale === 'ar'
                  ? 'الصورة غير متاحة.'
                  : 'Photo inaccessible.'}
            </p>
          )}
        </div>
      </header>

      <ProfileCard>
        <SectionHeading
          title={locale === 'en' ? 'Bio' : locale === 'ar' ? 'السيرة الذاتية' : 'Biographie'}
          onEdit={() => setSheet('bio')}
        />
        <div className="relative px-2">
          <span className="block text-[28px] leading-[0.8] font-extrabold text-[#2F76BB]">
            &quot;
          </span>
          <p className="px-1 text-[13px] leading-[1.6] text-[#555]">
            {bio ||
              (locale === 'en'
                ? 'Tap to edit'
                : locale === 'ar'
                  ? 'انقر للتعديل'
                  : 'Appuyez pour modifier')}
          </p>
          <span className="block text-right text-[28px] leading-[0.8] font-extrabold text-[#2F76BB]">
            &quot;
          </span>
        </div>
      </ProfileCard>

      <TagCard
        title={locale === 'en' ? 'Interests' : locale === 'ar' ? 'الاهتمامات' : 'Centres d’intérêt'}
        values={interests}
        color="#2F76BB"
        icon={iconBox(<Heart size={15} color="#F5A623" />, '#FFF8EB')}
        onEdit={() => setSheet('interests')}
      />
      <TagCard
        title={locale === 'en' ? 'My goals' : locale === 'ar' ? 'أهدافي' : 'Mes objectifs'}
        values={goals}
        color="#61BCA6"
        icon={iconBox(<Target size={15} color="#61BCA6" />, '#E8F7F3')}
        onEdit={() => setSheet('goals')}
      />

      <ProfileCard>
        <SectionHeading
          title={
            locale === 'en'
              ? 'Contact preferences'
              : locale === 'ar'
                ? 'تفضيلات التواصل'
                : 'Préférences de contact'
          }
          icon={iconBox(<Phone size={15} color="#9B59B6" />, '#F3E8FA')}
          onEdit={() => setSheet('contact')}
        />
        <div className="flex gap-3">
          {CONTACT_OPTIONS.map((option) => {
            const active = contactModes.includes(option.value);
            const visual =
              option.value === 'phone'
                ? { Icon: Phone, color: '#F5A623', background: '#FFF8EB' }
                : option.value === 'whatsapp'
                  ? { Icon: MessageCircle, color: '#25D366', background: '#E8F9F0' }
                  : { Icon: Coffee, color: '#61BCA6', background: '#E8F7F3' };
            const ContactIcon = visual.Icon;
            const label =
              option.value === 'phone'
                ? locale === 'en'
                  ? 'Phone call'
                  : locale === 'ar'
                    ? 'مكالمة هاتفية'
                    : 'Appel téléphonique'
                : option.value === 'whatsapp'
                  ? 'WhatsApp / Chat'
                  : locale === 'en'
                    ? 'In-person'
                    : locale === 'ar'
                      ? 'لقاء حضوري'
                      : 'Rendez-vous présentiel';
            return (
              <div
                key={option.value}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-2.5 text-center"
                style={{
                  background: active ? visual.background : '#F5F7FA',
                  border: active ? `1.5px solid ${visual.color}` : '1.5px solid transparent',
                }}
              >
                <ContactIcon size={18} color={active ? visual.color : '#BBBBBB'} />
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: active ? visual.color : '#AAA' }}
                >
                  {label}
                </span>
                {active && (
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full"
                    style={{ background: visual.color }}
                  >
                    <Check size={9} color="white" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </ProfileCard>

      <ProfileCard>
        <SectionHeading
          title={
            locale === 'en'
              ? 'Offer a service'
              : locale === 'ar'
                ? 'تقديم خدمة'
                : 'Offrir un service'
          }
          icon={iconBox(<Briefcase size={15} color="#F5A623" />, '#FFF8EB')}
        />
        <div className="mb-3 flex items-center justify-between rounded-xl bg-[#F5F7FA] px-3 py-2 text-[13px] text-[#555]">
          {locale === 'en'
            ? 'Enable service offering'
            : locale === 'ar'
              ? 'تفعيل تقديم الخدمة'
              : 'Activer l’offre de service'}
          <button
            type="button"
            role="switch"
            aria-checked={offerService}
            onClick={() => setOfferService((value) => !value)}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
            style={{ background: offerService ? '#2F76BB' : '#E0E0E0' }}
            dir="ltr"
          >
            <span
              className="h-4 w-4 rounded-full bg-white transition-transform"
              style={{ transform: offerService ? 'translateX(18px)' : 'translateX(2px)' }}
            />
          </button>
        </div>
        {offerService && (
          <button
            type="button"
            onClick={() => setSheet('service')}
            className="flex w-full items-center justify-between rounded-xl bg-[#F5F7FA] px-3 py-2.5 text-left"
          >
            <span>
              <span className="block text-xs text-[#888]">
                {locale === 'en'
                  ? 'Service type'
                  : locale === 'ar'
                    ? 'نوع الخدمة'
                    : 'Type de service'}
              </span>
              <span className="text-sm font-semibold text-[#353535]">
                {serviceType || (locale === 'en' ? 'Choose' : locale === 'ar' ? 'اختر' : 'Choisir')}{' '}
                · {price || '0'} DT/{locale === 'en' ? 'hr' : locale === 'ar' ? 'ساعة' : 'heure'}
              </span>
            </span>
            <ChevronDown size={16} color="#AAA" />
          </button>
        )}
      </ProfileCard>

      {isIndividual && (
        <>
          <ProfileCard>
            <SectionHeading
              title={
                locale === 'en'
                  ? 'Experience & education'
                  : locale === 'ar'
                    ? 'الخبرة والتعليم'
                    : 'Expérience & formation'
              }
              icon={iconBox(<Briefcase size={15} color="#2F76BB" />, '#E8F0FA')}
            />
            <InfoRow
              label={locale === 'en' ? 'Experience' : locale === 'ar' ? 'الخبرة' : 'Expérience'}
              value={experience}
              onClick={() => setSheet('experience')}
            />
            <InfoRow
              label={
                locale === 'en'
                  ? 'Industry sector'
                  : locale === 'ar'
                    ? 'قطاع النشاط'
                    : 'Secteur d’activité'
              }
              value={sector}
              onClick={() => setSheet('sector')}
            />
            <InfoRow
              label={
                locale === 'en'
                  ? 'Education level'
                  : locale === 'ar'
                    ? 'المستوى التعليمي'
                    : 'Niveau d’éducation'
              }
              value={education}
              onClick={() => setSheet('education')}
            />
          </ProfileCard>
          <ExperienceSection
            values={experiences}
            onChange={setExperiences}
            onSave={(values) => save({ experiences: values })}
          />
          <EducationSection
            values={educations}
            onChange={setEducations}
            onSave={(values) => save({ educations: values })}
          />
        </>
      )}

      <TagCard
        title={
          locale === 'en'
            ? 'Languages spoken'
            : locale === 'ar'
              ? 'اللغات المحدثة'
              : 'Langues parlées'
        }
        values={languages.map((value) => {
          const option = LANGUAGE_OPTIONS.find((entry) => entry.value === value);
          if (!option) return value;
          return (
            <span key={value} className="inline-flex items-center gap-1.5 align-middle">
              <ProfileLanguageFlag locale={value} />
              <span>{option.label}</span>
            </span>
          );
        })}
        color="#2F76BB"
        icon={iconBox(<Globe size={15} color="#2F76BB" />, '#EEF5FF')}
        onEdit={() => setSheet('languages')}
      />

      {offerService && (
        <ProfileCard>
          <SectionHeading
            title={
              locale === 'en'
                ? 'Availability'
                : locale === 'ar'
                  ? 'الأوقات المتاحة'
                  : 'Disponibilités'
            }
            icon={iconBox(<Clock size={15} color="#F5A623" />, '#FFF8EB')}
            onEdit={() => setSheet('availability')}
          />
          {availabilityDays.length ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {availabilityDays.map((day) => (
                  <span
                    key={day}
                    className="rounded-lg bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] px-2.5 py-1 text-[11px] font-bold text-white"
                  >
                    {day}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {availabilityHours.map((hour) => (
                  <span
                    key={hour}
                    className="rounded-lg bg-[#E8F7F3] px-2.5 py-1 text-[11px] font-semibold text-[#2A9177]"
                  >
                    {TIME_SLOTS.find((slot) => slot.value === hour)?.label ?? hour}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSheet('availability')}
              className="flex items-center gap-1 text-[13px] text-[#AAA]"
            >
              <Plus size={14} /> {locale === 'en' ? 'Add' : locale === 'ar' ? 'إضافة' : 'Ajouter'}
            </button>
          )}
        </ProfileCard>
      )}

      {isIndividual && (
        <ProfileCard>
          <SectionHeading
            title={
              locale === 'en'
                ? 'Presentation video'
                : locale === 'ar'
                  ? 'فيديو العرض التقديمي'
                  : 'Vidéo de présentation'
            }
            icon={iconBox(<Video size={15} color="#9B59B6" />, '#F3E8FA')}
          />
          {serverVideo ? (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-[#C5EBE0] bg-[#F0FBF8] px-3 py-2.5">
                <Video size={16} color="#61BCA6" className="shrink-0" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#2A9177]">
                  {videoFilename}
                </span>
                <button
                  type="button"
                  onClick={() => setShowVideoPreview((value) => !value)}
                  disabled={video.loading || !video.url}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#2F76BB] disabled:opacity-40"
                  aria-label={
                    showVideoPreview
                      ? locale === 'en'
                        ? 'Hide video'
                        : locale === 'ar'
                          ? 'إخفاء الفيديو'
                          : 'Masquer la vidéo'
                      : locale === 'en'
                        ? 'Play video'
                        : locale === 'ar'
                          ? 'تشغيل الفيديو'
                          : 'Lire la vidéo'
                  }
                >
                  <Play size={13} fill="currentColor" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete('video')}
                  disabled={mediaUploading}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white disabled:opacity-40"
                  aria-label={
                    locale === 'en'
                      ? 'Delete video'
                      : locale === 'ar'
                        ? 'حذف الفيديو'
                        : 'Supprimer la vidéo'
                  }
                >
                  <X size={14} color="#AAA" />
                </button>
              </div>
              {video.loading && (
                <p className="mt-2 text-xs text-[#888]">
                  {locale === 'en'
                    ? 'Loading video...'
                    : locale === 'ar'
                      ? 'جارٍ التحميل...'
                      : 'Chargement de la vidéo…'}
                </p>
              )}
              {(video.error || videoPlaybackError) && (
                <p className="mt-2 text-xs text-[#E24E59]" role="alert">
                  {locale === 'en'
                    ? 'Video unavailable or missing.'
                    : locale === 'ar'
                      ? 'هذا الفيديو غير متاح.'
                      : 'Cette vidéo est inaccessible ou manquante.'}
                </p>
              )}
              {showVideoPreview && video.url && (
                <video
                  src={video.url}
                  controls
                  playsInline
                  onLoadedMetadata={() => setVideoPlaybackError(false)}
                  onError={() => setVideoPlaybackError(true)}
                  className="mt-3 aspect-video w-full rounded-xl bg-black object-contain"
                />
              )}
              <Link
                href="/settings/video"
                className="mt-3 inline-flex text-xs font-semibold text-[#2F76BB]"
              >
                {locale === 'en'
                  ? 'Manage in video settings'
                  : locale === 'ar'
                    ? 'إدارة في إعدادات الفيديو'
                    : 'Gérer dans les paramètres vidéo'}
              </Link>
            </>
          ) : (
            <p className="text-[13px] text-[#AAA]">
              {locale === 'en'
                ? 'No video added'
                : locale === 'ar'
                  ? 'لم يتم إضافة فيديو'
                  : 'Aucune vidéo ajoutée'}
            </p>
          )}
        </ProfileCard>
      )}

      <div className="mx-4 mb-4">
        {(error || mediaError) && (
          <p className="mb-2 text-center text-xs text-[#E24E59]" role="alert">
            {error || humanizeMediaError(mediaError)}
          </p>
        )}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || mediaUploading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#2F76BB] to-[#61BCA6] py-4 text-[15px] font-bold text-white shadow-lg disabled:opacity-60"
        >
          <Check size={18} />
          {saving
            ? locale === 'en'
              ? 'Saving...'
              : locale === 'ar'
                ? 'جارٍ الحفظ...'
                : 'Enregistrement…'
            : locale === 'en'
              ? 'Save'
              : locale === 'ar'
                ? 'حفظ'
                : 'Enregistrer'}
        </button>
      </div>

      {saved && (
        <div
          className={`fixed ${isRtl ? 'left-4' : 'right-4'} bottom-6 z-50 rounded-2xl bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] px-5 py-3 text-center text-sm font-bold text-white shadow-lg md:w-80`}
          role="status"
        >
          {locale === 'en'
            ? '✓ Profile updated'
            : locale === 'ar'
              ? '✓ تم تحديث الملف الشخصي'
              : '✓ Profil mis à jour'}
        </div>
      )}

      <ProfileSheets
        sheet={sheet}
        close={() => {
          setSheet(null);
          setError(null);
        }}
        error={error}
        name={name}
        setName={setName}
        job={job}
        setJob={setJob}
        bio={bio}
        setBio={setBio}
        interests={interests}
        setInterests={setInterests}
        goals={goals}
        setGoals={setGoals}
        contactModes={contactModes}
        setContactModes={setContactModes}
        experience={experience}
        setExperience={setExperience}
        sector={sector}
        setSector={setSector}
        education={education}
        setEducation={setEducation}
        serviceType={serviceType}
        setServiceType={setServiceType}
        price={price}
        setPrice={setPrice}
        languages={languages}
        setLanguages={setLanguages}
        availabilityDays={availabilityDays}
        setAvailabilityDays={setAvailabilityDays}
        availabilityHours={availabilityHours}
        setAvailabilityHours={setAvailabilityHours}
        persist={save}
      />

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4"
          onMouseDown={() => setConfirmDelete(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDEAEA]">
              <Trash2 size={20} color="#E24E59" />
            </div>
            <h2 id="confirm-delete-title" className="mt-4 text-base font-extrabold text-[#1A1A2E]">
              {confirmDelete === 'photo'
                ? locale === 'en'
                  ? 'Delete photo?'
                  : locale === 'ar'
                    ? 'حذف الصورة؟'
                    : 'Supprimer la photo ?'
                : locale === 'en'
                  ? 'Delete video?'
                  : locale === 'ar'
                    ? 'حذف الفيديو؟'
                    : 'Supprimer la vidéo ?'}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#777]">
              {confirmDelete === 'photo'
                ? locale === 'en'
                  ? 'Are you sure you want to delete your profile photo? This action cannot be undone.'
                  : locale === 'ar'
                    ? 'هل أنت متأكد من رغبتك في حذف صورة ملفك الشخصي؟ لا يمكن التراجع عن هذا الإجراء.'
                    : 'Êtes-vous sûr de vouloir supprimer votre photo de profil ? Cette action est irréversible.'
                : locale === 'en'
                  ? 'Are you sure you want to delete your presentation video? This action cannot be undone.'
                  : locale === 'ar'
                    ? 'هل أنت متأكد من رغبتك في حذف فيديو العرض التقديمي؟ لا يمكن التراجع عن هذا الإجراء.'
                    : 'Êtes-vous sûr de vouloir supprimer votre vidéo de présentation ? Cette action est irréversible.'}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-2xl border border-[#E0E0E0] py-3 text-xs font-bold text-[#1A1A2E]"
              >
                {locale === 'en' ? 'Cancel' : locale === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={() => void (confirmDelete === 'photo' ? removePhoto() : removeVideo())}
                className="flex-1 rounded-2xl bg-[#E24E59] py-3 text-xs font-extrabold text-white"
              >
                {locale === 'en' ? 'Delete' : locale === 'ar' ? 'حذف' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileLanguageFlag({ locale, size = 14 }: { locale: string; size?: number }) {
  const width = Math.round(size * 1.45);
  const wrap = {
    width,
    height: size,
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
    flexShrink: 0,
    borderRadius: 2,
  };
  const svg = { display: 'block' as const, width: '100%', height: '100%' };

  if (locale === 'fr') {
    return (
      <div style={wrap}>
        <svg viewBox="0 0 3 2" style={svg} aria-hidden>
          <rect width="1" height="2" fill="#002395" />
          <rect x="1" width="1" height="2" fill="#fff" />
          <rect x="2" width="1" height="2" fill="#ED2939" />
        </svg>
      </div>
    );
  }
  if (locale === 'en') {
    return (
      <div style={wrap}>
        <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" style={svg} aria-hidden>
          <rect width="60" height="30" fill="#012169" />
          <g fill="#fff">
            <polygon points="0,0 60,30 60,25 5,0" />
            <polygon points="60,0 0,30 0,25 55,0" />
          </g>
          <g fill="#C8102E">
            <polygon points="0,0 60,30 60,27 3,0" />
            <polygon points="60,0 0,30 0,27 57,0" />
            <rect x="25" width="10" height="30" />
            <rect y="10" width="60" height="10" />
          </g>
        </svg>
      </div>
    );
  }
  if (locale === 'ar') {
    return (
      <div style={wrap}>
        <svg viewBox="0 0 3 2" style={svg} aria-hidden>
          <rect width="3" height="2" fill="#E71F19" />
          <circle cx="1.5" cy="1" r="0.5" fill="#fff" />
          <circle cx="1.6" cy="1" r="0.4" fill="#E71F19" />
          <circle cx="1.5" cy="1" r="0.4" fill="#fff" />
          <path d="M 1.6,0.8 A 0.2,0.2 0 1,0 1.6,1.2 A 0.2,0.2 0 1,0 1.6,0.8 Z" fill="#E71F19" />
        </svg>
      </div>
    );
  }
  const option = LANGUAGE_OPTIONS.find((e) => e.value === locale);
  return option ? <span style={{ fontSize: size }}>{option.flag}</span> : null;
}

function TagCard({
  title,
  values,
  color,
  icon,
  onEdit,
}: {
  title: string;
  values: ReactNode[];
  color: string;
  icon: ReactNode;
  onEdit: () => void;
}) {
  const { locale } = useI18n();
  return (
    <ProfileCard>
      <SectionHeading title={title} icon={icon} onEdit={onEdit} />
      <div className="flex flex-wrap gap-2">
        {values.length ? (
          values.map((value, i) => (
            <span
              key={i}
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ border: `1px solid ${color}`, color, background: `${color}12` }}
            >
              {value}
            </span>
          ))
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 text-[13px] text-[#AAA]"
          >
            <Plus size={14} /> {locale === 'en' ? 'Add' : locale === 'ar' ? 'إضافة' : 'Ajouter'}
          </button>
        )}
      </div>
    </ProfileCard>
  );
}

function InfoRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  const { locale } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 flex w-full items-center justify-between rounded-xl bg-[#F5F7FA] px-3 py-2.5 text-left last:mb-0"
    >
      <span>
        <span className="block text-xs text-[#888]">{label}</span>
        <span className="text-sm font-semibold text-[#353535]">
          {value ||
            (locale === 'en'
              ? 'Tap to edit'
              : locale === 'ar'
                ? 'انقر للتعديل'
                : 'Appuyez pour modifier')}
        </span>
      </span>
      <ChevronDown size={16} color="#AAA" />
    </button>
  );
}

type SheetProps = {
  sheet: Sheet;
  close: () => void;
  error: string | null;
  name: string;
  setName: (value: string) => void;
  job: string;
  setJob: (value: string) => void;
  bio: string;
  setBio: (value: string) => void;
  interests: string[];
  setInterests: (value: string[]) => void;
  goals: string[];
  setGoals: (value: string[]) => void;
  contactModes: string[];
  setContactModes: (value: string[]) => void;
  experience: string;
  setExperience: (value: string) => void;
  sector: string;
  setSector: (value: string) => void;
  education: string;
  setEducation: (value: string) => void;
  serviceType: string;
  setServiceType: (value: string) => void;
  price: string;
  setPrice: (value: string) => void;
  languages: string[];
  setLanguages: (value: string[]) => void;
  availabilityDays: string[];
  setAvailabilityDays: (value: string[]) => void;
  availabilityHours: string[];
  setAvailabilityHours: (value: string[]) => void;
  persist: (overrides?: ProfileSaveOverrides) => Promise<boolean>;
};

function ProfileSheets(props: SheetProps) {
  const { locale } = useI18n();
  if (props.sheet === 'interests')
    return (
      <TagEditor
        title={locale === 'en' ? 'Interests' : locale === 'ar' ? 'الاهتمامات' : 'Centres d’intérêt'}
        values={props.interests}
        suggestions={INTERESTS_SUGGESTIONS}
        maxItems={MAX_INTERESTS}
        onChange={props.setInterests}
        onClose={props.close}
        onSave={(values) => props.persist({ interests: values })}
        error={props.error}
      />
    );
  if (props.sheet === 'goals')
    return (
      <TagEditor
        title={locale === 'en' ? 'Goals' : locale === 'ar' ? 'الأهداف' : 'Objectifs'}
        values={props.goals}
        suggestions={GOAL_CATEGORIES.flatMap((category) => category.options)}
        onChange={props.setGoals}
        onClose={props.close}
        onSave={(values) => props.persist({ goals: values })}
        error={props.error}
      />
    );
  if (props.sheet === 'contact')
    return (
      <ChoiceEditor
        title={
          locale === 'en'
            ? 'Contact preferences'
            : locale === 'ar'
              ? 'تفضيلات التواصل'
              : 'Préférences de contact'
        }
        values={CONTACT_OPTIONS.map(({ value, label }) => ({ value, label }))}
        selected={props.contactModes}
        multiple
        onChange={props.setContactModes}
        onClose={props.close}
        onSave={(values) => props.persist({ contactModes: values })}
        error={props.error}
      />
    );
  if (props.sheet === 'experience')
    return (
      <ChoiceEditor
        title={locale === 'en' ? 'Experience' : locale === 'ar' ? 'الخبرة' : 'Expérience'}
        values={EXPERIENCE_OPTIONS.map((value) => ({ value, label: value }))}
        selected={[props.experience]}
        onChange={([value = '']) => props.setExperience(value)}
        onClose={props.close}
        onSave={([value = '']) => props.persist({ experience: value })}
        error={props.error}
      />
    );
  if (props.sheet === 'sector')
    return (
      <ChoiceEditor
        title={
          locale === 'en' ? 'Industry' : locale === 'ar' ? 'قطاع النشاط' : 'Secteur d’activité'
        }
        values={SECTOR_OPTIONS.map((value) => ({ value, label: value }))}
        selected={[props.sector]}
        onChange={([value = '']) => props.setSector(value)}
        onClose={props.close}
        onSave={([value = '']) => props.persist({ sector: value })}
        error={props.error}
      />
    );
  if (props.sheet === 'education')
    return (
      <ChoiceEditor
        title={
          locale === 'en'
            ? 'Education level'
            : locale === 'ar'
              ? 'المستوى التعليمي'
              : 'Niveau d’éducation'
        }
        values={EDUCATION_OPTIONS.map((value) => ({ value, label: value }))}
        selected={[props.education]}
        onChange={([value = '']) => props.setEducation(value)}
        onClose={props.close}
        onSave={([value = '']) => props.persist({ education: value })}
        error={props.error}
      />
    );
  if (props.sheet === 'languages')
    return (
      <ChoiceEditor
        title={
          locale === 'en'
            ? 'Spoken languages'
            : locale === 'ar'
              ? 'اللغات المحكية'
              : 'Langues parlées'
        }
        values={LANGUAGE_OPTIONS.map(({ value, label }) => ({ value, label }))}
        selected={props.languages}
        multiple
        onChange={props.setLanguages}
        onClose={props.close}
        onSave={(values) => props.persist({ languages: values })}
        error={props.error}
      />
    );
  if (props.sheet === 'availability') return <AvailabilitySheet {...props} />;
  if (props.sheet === 'identity') return <IdentitySheet {...props} />;
  if (props.sheet === 'bio') return <BioSheet {...props} />;
  if (props.sheet === 'service') return <ServiceSheet {...props} />;
  return null;
}

// Local-draft rule: this sheet's inputs only ever write to local state, mirroring
// TagEditor/ChoiceEditor — the parent's bio only changes once Enregistrer actually
// persists, so dismissing without saving can never leak into a later, unrelated save.
function BioSheet(props: SheetProps) {
  const { locale } = useI18n();
  const [draft, setDraft] = useState(props.bio);
  return (
    <EditSheet
      title={locale === 'en' ? 'About you' : locale === 'ar' ? 'نبذة عنك' : 'À propos de vous'}
      onClose={props.close}
      error={props.error}
    >
      <textarea
        value={draft}
        maxLength={250}
        rows={5}
        onChange={(event) => setDraft(event.target.value)}
        className="w-full resize-none rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] px-4 py-3 text-sm outline-none"
      />
      <p className="mt-1 text-right text-[11px] text-[#AAA]">{draft.length}/250</p>
      <SheetButton
        onClick={async () => {
          if (await props.persist({ bio: draft })) {
            props.setBio(draft);
            props.close();
          }
        }}
      />
    </EditSheet>
  );
}

function ServiceSheet(props: SheetProps) {
  const { locale } = useI18n();
  const [serviceType, setServiceType] = useState(props.serviceType);
  const [price, setPrice] = useState(props.price);
  return (
    <EditSheet
      title={
        locale === 'en' ? 'Service offered' : locale === 'ar' ? 'الخدمة المقدمة' : 'Service proposé'
      }
      onClose={props.close}
      error={props.error}
    >
      <label className="mb-4 block text-xs text-[#888]">
        {locale === 'en' ? 'Service type' : locale === 'ar' ? 'نوع الخدمة' : 'Type de service'}
        <select
          value={serviceType}
          onChange={(event) => setServiceType(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] px-4 py-3 text-sm"
        >
          <option value="">
            {locale === 'en' ? 'Choose' : locale === 'ar' ? 'اختر' : 'Choisir'}
          </option>
          {SERVICE_TYPES.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="mb-4 block text-xs text-[#888]">
        {locale === 'en'
          ? 'Price (TND/hour)'
          : locale === 'ar'
            ? 'السعر (د.ت/ساعة)'
            : 'Prix (DT/heure)'}
        <input
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value.replace(/[^\d.,]/g, '').slice(0, 20))}
          className="mt-1.5 w-full rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] px-4 py-3 text-sm"
        />
      </label>
      <SheetButton
        onClick={async () => {
          if (await props.persist({ serviceType, price })) {
            props.setServiceType(serviceType);
            props.setPrice(price);
            props.close();
          }
        }}
      />
    </EditSheet>
  );
}

function AvailabilitySheet(props: SheetProps) {
  const { locale } = useI18n();
  const [days, setDays] = useState(props.availabilityDays);
  const [hours, setHours] = useState(props.availabilityHours);
  return (
    <EditSheet
      title={locale === 'en' ? 'Availability' : locale === 'ar' ? 'أوقات التوفر' : 'Disponibilités'}
      onClose={props.close}
      error={props.error}
    >
      <ChoiceGrid
        values={DAYS.map((day) => ({ value: day.short, label: day.long }))}
        selected={days}
        onChange={setDays}
      />
      <div className="mt-5">
        <ChoiceGrid values={TIME_SLOTS} selected={hours} onChange={setHours} />
      </div>
      <SheetButton
        onClick={async () => {
          if (await props.persist({ availabilityDays: days, availabilityHours: hours })) {
            props.setAvailabilityDays(days);
            props.setAvailabilityHours(hours);
            props.close();
          }
        }}
      />
    </EditSheet>
  );
}

function IdentitySheet(props: SheetProps) {
  const { locale } = useI18n();
  const split = splitName(props.name);
  const [first, setFirst] = useState(split.firstName);
  const [last, setLast] = useState(split.lastName);
  const [job, setJob] = useState(props.job);
  return (
    <EditSheet
      title={locale === 'en' ? 'Name' : locale === 'ar' ? 'الاسم' : 'Nom et prénom'}
      onClose={props.close}
      error={props.error}
    >
      <SheetInput
        label={locale === 'en' ? 'First name' : locale === 'ar' ? 'الاسم الأول' : 'Prénom'}
        value={first}
        onChange={setFirst}
      />
      <SheetInput
        label={locale === 'en' ? 'Last name' : locale === 'ar' ? 'اللقب' : 'Nom'}
        value={last}
        onChange={setLast}
      />
      <SheetInput
        label={locale === 'en' ? 'Profession' : locale === 'ar' ? 'المهنة' : 'Profession'}
        value={job}
        onChange={setJob}
      />
      <SheetButton
        onClick={async () => {
          const nextName = `${first.trim()} ${last.trim()}`.trim();
          if (await props.persist({ name: nextName, job })) {
            props.setName(nextName);
            props.setJob(job);
            props.close();
          }
        }}
      />
    </EditSheet>
  );
}

function SheetInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mb-4 block text-xs text-[#888]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] px-4 py-3 text-sm outline-none"
      />
    </label>
  );
}

function SheetButton({ onClick }: { onClick: () => void | Promise<void> }) {
  const { locale } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 w-full rounded-xl bg-[#2F76BB] py-3 text-sm font-bold text-white"
    >
      {locale === 'en' ? 'Save' : locale === 'ar' ? 'حفظ' : 'Enregistrer'}
    </button>
  );
}

function ChoiceGrid({
  values,
  selected,
  onChange,
}: {
  values: { value: string; label: string }[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {values.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            type="button"
            key={option.value}
            onClick={() =>
              onChange(
                active
                  ? selected.filter((value) => value !== option.value)
                  : [...selected, option.value],
              )
            }
            className="rounded-xl px-3 py-2.5 text-xs font-semibold"
            style={{
              background: active ? '#E8F7F3' : '#F5F7FA',
              border: `1.5px solid ${active ? '#61BCA6' : 'transparent'}`,
              color: active ? '#2A8F76' : '#555',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
