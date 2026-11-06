export type MatchGroup = 1 | 2 | 3 | 4;
export type MatchConfidence = 'high' | 'medium' | 'low';

export type ScoreBreakdown = {
  dimension: string;
  score: number;
  weight: number;
  contribution: number;
};

export type MatchingProfile = {
  id: string;
  name: string;
  image: string | null;
  video?: string | null;
  bio: string | null;
  job: string | null;
  category: string | null;
  city: string | null;
  interests: string[];
  goals?: string[];
  activity_sector: string | null;
  service_type: string | null;
  price?: string | null;
  availability_days?: string[];
  contact_modes?: string[];
  verified?: boolean;
  rating: number;
  reviews?: number | null;
};

export type FeedProfile = {
  id: string;
  name: string;
  image: string | null;
  video?: string | null;
  bio: string | null;
  job: string | null;
  category: string | null;
  city: string | null;
  interests: string[];
  goals: string[];
  activity_sector: string | null;
  service_type: string | null;
  rating: number;
  reviews?: number | null;
  distance_km: number | null;
  match_score: number;
  match_group: MatchGroup | number;
  match_type_label: string;
  confidence: MatchConfidence | string;
  compatibility: ScoreBreakdown[];
  liked_me: boolean;
  price?: string | null;
  availability_days?: string[];
  contact_modes?: string[];
  verified?: boolean;
  /** Search freemium: true when PII was redacted server-side for FREE plans. */
  is_locked?: boolean;
};

