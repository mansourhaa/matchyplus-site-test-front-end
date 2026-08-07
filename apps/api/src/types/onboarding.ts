import { User } from '@saas-boilerplate/types';

export type GetOnboardingProfilePayload = {
  userId: string;
};

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
  price?: string;
  interests?: string[];
  selectedGoals?: string[];
  availabilityDays?: string[];
  availabilityHours?: string[];
  contactModes?: string[];
  languages?: string[];
  experience?: string;
  sector?: string;
  educationLevel?: string;
  experiences?: ProfileExperience[];
  educations?: ProfileEducation[];
};

export type UpdateOnboardingProfileBody = Omit<UpdateOnboardingProfilePayload, 'userId'>;

export type CompleteOnboardingPayload = {
  userId: string;
};

export type OnboardingProfileResult = {
  profile: Partial<User> & { onboardingCompleted: boolean };
};
