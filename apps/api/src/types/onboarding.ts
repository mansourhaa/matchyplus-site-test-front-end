import { User } from '@saas-boilerplate/types';

export type WorkExperience = {
  title: string;
  company: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
};

export type Education = {
  school: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  result?: string;
};

export type GetOnboardingProfilePayload = {
  userId: string;
};

export type UpdateOnboardingProfilePayload = {
  userId: string;
  name?: string;
  job?: string;
  bio?: string;
  image?: string;
  city?: string;
  profileType?: 'INDIVIDUAL' | 'PROVIDER';
  offerService?: boolean;
  serviceType?: string;
  sector?: string;
  price?: string;
  interests?: string[];
  selectedGoals?: string[];
  experience?: string;
  experiences?: WorkExperience[];
  educationLevel?: string;
  educations?: Education[];
  availabilityDays?: string[];
  availabilityHours?: string[];
  contactModes?: string[];
  languages?: string[];
};

export type CompleteOnboardingPayload = {
  userId: string;
};

export type OnboardingProfileResult = {
  profile: Partial<User> & { onboardingCompleted: boolean };
};
