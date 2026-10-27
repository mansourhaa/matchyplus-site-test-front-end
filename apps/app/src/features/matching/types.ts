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
  video?: string | null;
  bio: string | null;
  job: string | null;
  category: string | null;
  city: string | null;
  interests: string[];
  activity_sector: string | null;
  service_type: string | null;
  price?: string | null;
  availability_days?: string[];
  contact_modes?: string[];
  verified?: boolean;
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
  /** Server-set for search freemium; locked rows have redacted PII. */
  is_locked?: boolean;
};

export type MatchRow = {
  match_id: string;
  matched_at: string;
  matched_user_id: string;
  conversation_id: string | null;
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
  conversation_id?: string | null;
};

export type SwipeResult = {
  swipe_id: string;
  direction: 'LEFT' | 'RIGHT';
  match: MatchSummary | null;
  quota: SwipeQuota;
};

export type DiscoveryFeedSort = 'match' | 'distance' | 'rating' | 'price_asc' | 'price_desc';

export type DiscoveryFeedQuery = {
  latitude?: number;
  longitude?: number;
  limit?: number;
  offset?: number;
  context?: 'swipe' | 'search';
  q?: string;
  maxDistanceKm?: number;
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

export type SwipeFeedResponse = {
  profiles: FeedProfile[];
  count?: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
  quota: SwipeQuota;
};

export type DiscoverySectorsResponse = {
  sectors: string[];
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
    viewerName?: string;
    viewerImage?: string | null;
    sender_name?: string;
    sender_image?: string | null;
  };
};

export type PushToastItem = {
  id: string;
  title: string;
  body: string;
  viewerImage: string | null;
};

export type SwipeHistoryFilter = 'all' | 'right' | 'left' | 'match';

export type SwipeHistoryItem = {
  id: string;
  direction: 'LEFT' | 'RIGHT' | 'SUPERLIKE';
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
  stats: SwipeHistoryStats;
  total: number;
  has_more: boolean;
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
  history: SwipeHistoryItem[];
  historyStats: SwipeHistoryStats | null;
  historyLoading: boolean;
  historyError: string | null;
  historyFilter: SwipeHistoryFilter;
  sectors?: string[];
};
