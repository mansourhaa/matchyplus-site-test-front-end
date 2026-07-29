import { User } from '@saas-boilerplate/types';

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
  price?: string;
  interests?: string[];
  selectedGoals?: string[];
  availabilityDays?: string[];
  availabilityHours?: string[];
  contactModes?: string[];
  languages?: string[];
};

export type UpdateOnboardingProfileBody = Omit<UpdateOnboardingProfilePayload, 'userId'>;

export type CompleteOnboardingPayload = {
  userId: string;
};

export type OnboardingProfileResult = {
  profile: Partial<User> & { onboardingCompleted: boolean };
};
