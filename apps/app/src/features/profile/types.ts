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
  experience: string | null;
  activity_sector: string | null;
  looking_for: string | null;
  selected_goals: string[];
  rating: number | null;
  reviews: number | null;
  matched: boolean;
  viewer_has_rated: boolean;
};

export type MediaUploadResult = {
  image?: string | null;
  video?: string | null;
};

export type RatingResult = {
  rating: number;
  reviews: number;
};

export type BlockedUser = {
  id: string;
  name: string;
  image: string | null;
  job: string | null;
  city: string | null;
  activity_sector: string | null;
  service_type: string | null;
  blocked_at: string;
};
