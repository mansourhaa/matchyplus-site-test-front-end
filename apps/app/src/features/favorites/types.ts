export type FavoriteProfile = {
  id: string;
  name: string;
  job: string | null;
  category: string | null;
  city: string | null;
  bio: string | null;
  image: string | null;
  video: string | null;
  rating: number;
  reviews: number;
  profile_type: string | null;
  offer_service: boolean;
  service_type: string | null;
  price: string | null;
  experience: string | null;
  schedule: string | null;
  languages: string[];
  interests: string[];
  contact_modes: string[];
  match_score: number;
  match_type_label?: string;
  distance_km?: number | null;
  favorited_at: string;
};

export type FavoritesListResponse = {
  favorites: FavoriteProfile[];
  total: number;
};

export type FavoriteToggleResponse = {
  favorited: boolean;
  targetUserId: string;
};

export type FavoriteIdsResponse = {
  favoriteIds: string[];
};

export type FavoritesState = {
  favorites: FavoriteProfile[];
  favoriteIds: string[];
  total: number;
  loading: boolean;
  actionLoading: Record<string, boolean>;
  error: string | null;
};
