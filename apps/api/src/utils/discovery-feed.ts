import { Prisma } from '@saas-boilerplate/types';

import { ScoringProfile } from './matching-score.js';

export const feedUserSelect = {
  id: true,
  name: true,
  image: true,
  bio: true,
  job: true,
  category: true,
  city: true,
  interests: true,
  goals: true,
  looking_for: true,
  activity_sector: true,
  service_type: true,
  profile_type: true,
  gps_latitude: true,
  gps_longitude: true,
  rating: true,
  status: true,
  location: {
    select: {
      latitude: true,
      longitude: true,
      location_enabled: true,
      city: true,
      country: true,
    },
  },
} satisfies Prisma.UserSelect;

export type FeedUser = Prisma.UserGetPayload<{ select: typeof feedUserSelect }>;

export function toScoringProfile(user: FeedUser): ScoringProfile {
  return {
    id: user.id,
    interests: user.interests,
    goals: user.goals,
    looking_for: user.looking_for,
    bio: user.bio,
    activity_sector: user.activity_sector,
    service_type: user.service_type,
    job: user.job,
    category: user.category,
    profile_type: user.profile_type,
  };
}

export function resolveCoords(
  queryLat?: number,
  queryLon?: number,
  user?: FeedUser,
): { latitude: number; longitude: number } | null {
  if (
    queryLat != null &&
    queryLon != null &&
    Number.isFinite(queryLat) &&
    Number.isFinite(queryLon)
  ) {
    return { latitude: queryLat, longitude: queryLon };
  }
  if (user?.location?.location_enabled) {
    return {
      latitude: user.location.latitude,
      longitude: user.location.longitude,
    };
  }
  if (user?.gps_latitude != null && user?.gps_longitude != null) {
    return { latitude: user.gps_latitude, longitude: user.gps_longitude };
  }
  return null;
}
