import { SwipeDirection } from '@saas-boilerplate/types';

import { MatchConfidence, MatchGroup, ScoreBreakdown } from '../utils/matching-score.js';

export type PostSwipeBody = {
  target_user_id: string;
  direction: 'left' | 'right';
};

export type SwipeQuota = {
  plan: string;
  unlimited: boolean;
  used: number | null;
  limit: number | null;
  remaining: number | null;
  /** Always UTC midnight — clients should convert for display. */
  resets_at: 'midnight_utc';
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
  distance_km: number | null;
  match_score: number;
  match_group: MatchGroup;
  match_type_label: string;
  confidence: MatchConfidence;
  compatibility: ScoreBreakdown[];
  liked_me: boolean;
  price?: string | null;
  availability_days?: string[];
  contact_modes?: string[];
  verified?: boolean;
  /** Search freemium: true when PII was redacted server-side for FREE plans. */
  is_locked?: boolean;
};

export type MatchSummary = {
  match_id: string;
  matched_at: Date;
  matched_user_id: string;
  conversation_id?: string | null;
};

export type SwipeResult = {
  swipe_id: string;
  direction: SwipeDirection;
  match: MatchSummary | null;
  quota: SwipeQuota;
};

export type DiscoveryFeedSort = 'match' | 'distance' | 'rating' | 'price_asc' | 'price_desc';

export type DiscoveryFeedQuery = {
  latitude?: number;
  longitude?: number;
  limit?: number;
  offset?: number;
  /** `search` applies FREE profiles_per_category lock + PII redaction. */
  context?: 'swipe' | 'search';
  /** Case-insensitive match on name / job / service_type / category / city / interests. */
  q?: string;
  /** Override discovery radius for this request (km). Default: env DISCOVERY_RADIUS_M. */
  maxDistanceKm?: number;
  /** Comma-separated service type / job labels. */
  serviceTypes?: string;
  sector?: string;
  sectors?: string;
  interests?: string;
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  profileType?: 'INDIVIDUAL' | 'PROVIDER';
  minRating?: number;
  sort?: DiscoveryFeedSort;
};

export type TargetUserParams = {
  userId: string;
};

export type RealtimeQuery = {
  access_token?: string;
};

export type MatchingProfile = {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  job: string | null;
  category: string | null;
  city: string | null;
  interests: string[];
  goals: string[];
  activity_sector: string | null;
  service_type: string | null;
  rating: number;
};

export type SwipeHistoryFilter = 'all' | 'right' | 'left' | 'match';

export type SwipeHistoryQuery = {
  direction?: SwipeHistoryFilter;
  limit?: number;
  offset?: number;
  q?: string;
};

export type SwipeHistoryItem = {
  id: string;
  direction: SwipeDirection;
  swiped_at: string;
  is_matched: boolean;
  conversation_id: string | null;
  target: MatchingProfile;
};

export type SwipeHistoryStats = {
  total_swipes: number;
  likes: number;
  passes: number;
  matches: number;
  match_rate: number;
};

export type SwipeHistoryResponse = {
  items: SwipeHistoryItem[];
  total: number;
  has_more: boolean;
  stats: SwipeHistoryStats;
};
