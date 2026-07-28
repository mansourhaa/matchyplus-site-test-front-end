export type SwipeQuota = {
  plan: string;
  unlimited: boolean;
  used: number | null;
  limit: number | null;
  remaining: number | null;
  resets_at: 'midnight_utc';
};

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
  bio: string | null;
  job: string | null;
  category: string | null;
  city: string | null;
  interests: string[];
  activity_sector: string | null;
  service_type: string | null;
  rating: number;
};

export type FeedProfile = MatchingProfile & {
  goals: string[];
  distance_km: number | null;
  match_score: number;
  match_group: number;
  match_type_label: string;
  confidence: string;
  compatibility: ScoreBreakdown[];
  liked_me: boolean;
};

export type MatchRow = {
  match_id: string;
  matched_at: string;
  matched_user_id: string;
  profile: MatchingProfile | null;
};

export type PendingRow = {
  swipe_id: string;
  liked_at: string;
  profile: MatchingProfile;
};

export type MatchSummary = {
  match_id: string;
  matched_at: string;
  matched_user_id: string;
};

export type SwipeResult = {
  swipe_id: string;
  direction: 'LEFT' | 'RIGHT';
  match: MatchSummary | null;
  quota: SwipeQuota;
};

export type DiscoveryFeedQuery = {
  latitude?: number;
  longitude?: number;
  limit?: number;
};

export type SwipeFeedResponse = {
  profiles: FeedProfile[];
  quota: SwipeQuota;
};

export type MatchStateResponse = {
  matches: MatchRow[];
  pending: PendingRow[];
};

export type SwipeProfileInput = {
  targetUserId: string;
  direction: 'left' | 'right';
  profile?: FeedProfile;
};

export type SwipeProfileResult = Omit<SwipeResult, 'direction'> & {
  targetUserId: string;
  direction: 'left' | 'right';
  profile: FeedProfile | null;
};

export type RealtimeMessage = {
  event?: string;
  payload?: {
    event_type?: string;
    matched_user_id?: string;
  };
};

export type MatchingState = {
  feed: FeedProfile[];
  feedLoading: boolean;
  feedError: string | null;
  feedLoaded: boolean;
  matches: MatchRow[];
  pending: PendingRow[];
  matchesLoading: boolean;
  matchesError: string | null;
  quota: SwipeQuota | null;
  quotaLoading: boolean;
  quotaError: string | null;
  swipeLoading: boolean;
  swipeError: string | null;
  withdrawLoadingId: string | null;
  celebrationProfile: FeedProfile | MatchingProfile | null;
  showQuotaModal: boolean;
};
