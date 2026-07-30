import type { ProfileType } from '@/features/onboarding/types';

export type PublicProfile = {
  id: string;
  name: string;
  job: string | null;
  bio: string | null;
  image: string | null;
  video: string | null;
  city: string | null;
  interests: string[];
  languages: string[];
  contact_modes: string[];
  availability_days?: string[];
  availability_hours?: string[];
  offer_service: boolean;
  service_type: string | null;
  price: string | null;
  profile_type: ProfileType | null;
  rating: number | null;
  reviews: number | null;
};

export type MediaUploadResult = {
  image?: string | null;
  video?: string | null;
};
