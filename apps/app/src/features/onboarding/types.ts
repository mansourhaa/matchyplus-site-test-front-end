export type ProfileType = 'INDIVIDUAL' | 'PROVIDER';

export interface OnboardingProfile {
  id: string;
  name: string | null;
  auth_provider: string;
  job: string | null;
  bio: string | null;
  image: string | null;
  city: string | null;
  profile_type: ProfileType | null;
  offer_service: boolean;
  service_type: string | null;
  price: string | null;
  interests: string[];
  selected_goals: string[];
  experience: string | null;
  availability_days: string[];
  availability_hours: string[];
  contact_modes: string[];
  languages: string[];
  onboardingCompleted: boolean;
}

export type OnboardingProfilePatch = Partial<{
  name: string;
  job: string;
  bio: string;
  image: string;
  city: string;
  profileType: ProfileType;
  offerService: boolean;
  serviceType: string;
  price: string;
  interests: string[];
  selectedGoals: string[];
  experience: string;
  availabilityDays: string[];
  availabilityHours: string[];
  contactModes: string[];
  languages: string[];
}>;

export type OnboardingStep = 'identity' | 'interests' | 'location';
