export type ProfileType = 'INDIVIDUAL' | 'PROVIDER';

export type ProfileExperience = {
  id: string;
  title: string;
  company: string;
  type: string;
  startDate: string;
  endDate: string;
  current: boolean;
};

export type ProfileEducation = {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  result: string;
};

export interface OnboardingProfile {
  id: string;
  name: string | null;
  auth_provider: string;
  job: string | null;
  bio: string | null;
  image: string | null;
  video: string | null;
  city: string | null;
  profile_type: ProfileType | null;
  offer_service: boolean;
  service_type: string | null;
  price: string | null;
  interests: string[];
  selected_goals: string[];
  availability_days: string[];
  availability_hours: string[];
  contact_modes: string[];
  languages: string[];
  experience?: string | null;
  sector?: string | null;
  education_level?: string | null;
  experiences?: ProfileExperience[] | null;
  educations?: ProfileEducation[] | null;
  rating?: number;
  reviews?: number;
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
  availabilityDays: string[];
  availabilityHours: string[];
  contactModes: string[];
  languages: string[];
  experience: string;
  sector: string;
  educationLevel: string;
  experiences: ProfileExperience[];
  educations: ProfileEducation[];
}>;

export type OnboardingStep =
  'identity' | 'interests' | 'experience' | 'education' | 'location' | 'welcome';
