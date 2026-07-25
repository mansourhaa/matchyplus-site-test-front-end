export type ProfileType = 'INDIVIDUAL' | 'PROVIDER';

export interface WorkExperience {
  title: string;
  company: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
}

export interface Education {
  school: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  result?: string;
}

export interface OnboardingProfile {
  id: string;
  name: string | null;
  job: string | null;
  bio: string | null;
  image: string | null;
  city: string | null;
  profile_type: ProfileType | null;
  offer_service: boolean;
  service_type: string | null;
  sector: string | null;
  price: string | null;
  interests: string[];
  selected_goals: string[];
  experience: string | null;
  experiences: WorkExperience[] | null;
  education_level: string | null;
  educations: Education[] | null;
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
  sector: string;
  price: string;
  interests: string[];
  selectedGoals: string[];
  experience: string;
  experiences: WorkExperience[];
  educationLevel: string;
  educations: Education[];
  availabilityDays: string[];
  availabilityHours: string[];
  contactModes: string[];
  languages: string[];
}>;

export type OnboardingStep = 'identity' | 'interests' | 'experience' | 'education' | 'location';
