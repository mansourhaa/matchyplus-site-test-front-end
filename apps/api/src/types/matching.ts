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
};

export type MatchSummary = {
  match_id: string;
  matched_at: Date;
  matched_user_id: string;
};

export type SwipeResult = {
  swipe_id: string;
  direction: SwipeDirection;
  match: MatchSummary | null;
  quota: SwipeQuota;
};

export type DiscoveryFeedQuery = {
  latitude?: number;
  longitude?: number;
  limit?: number;
};
