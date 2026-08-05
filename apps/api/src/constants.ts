import { Role } from '@saas-boilerplate/types';

export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

export const azureAdminUsername = 'azureuser';

// Only Google and LinkedIn OAuth are implemented; Facebook is intentionally excluded
// since no Facebook auth flow exists to ever set a user's auth_provider to it.
export const SOCIAL_AUTH_PROVIDERS = new Set(['google', 'linkedin']);

// For destructive, hard-to-undo actions such as account deletion.
export const RATE_LIMIT_STRICT = {
  max: 3,
  timeWindow: '1 hour',
};

export const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.MODERATOR, Role.SUPPORT];

/** Role hierarchy, lowest to highest. Used to keep a role from acting on its peers or superiors. */
export const ROLE_RANK: Record<Role, number> = {
  [Role.USER]: 0,
  [Role.SUPPORT]: 1,
  [Role.MODERATOR]: 2,
  [Role.SUPER_ADMIN]: 3,
};

/** Discovery radius in meters (env override: DISCOVERY_RADIUS_M). */
export const DISCOVERY_RADIUS_M = Number(process.env.DISCOVERY_RADIUS_M || 25_000);

/** Default swipe-feed page size (env override: DISCOVERY_PAGE_SIZE). */
export const DISCOVERY_PAGE_SIZE = Number(process.env.DISCOVERY_PAGE_SIZE || 20);

/**
 * Profile photo/video upload limits and MIME allow-lists, shared by ProfileService
 * (size + content-sniffing validation), the multipart plugin (global body-size ceiling),
 * and the users routes (per-endpoint rate limits) — kept in one place instead of
 * duplicated across those files.
 */
export const PROFILE_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PROFILE_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export const PROFILE_PHOTO_RATE_LIMIT = { max: 10, timeWindow: '1 hour' };
export const PROFILE_VIDEO_RATE_LIMIT = { max: 5, timeWindow: '1 hour' };
export const PROFILE_VIEW_RATE_LIMIT = { max: 30, timeWindow: '1 minute' };

/** Reopening the same profile within this window doesn't create another view notification. */
export const PROFILE_VIEW_NOTIFICATION_COOLDOWN_MS = 15 * 60 * 1000;

export const ALLOWED_PROFILE_PHOTO_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_PROFILE_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/ogg',
  'video/3gpp',
  'video/3gpp2',
];

/** Content types served on GET /profiles/media/{photos,videos}/:filename, by extension. */
export const PROFILE_PHOTO_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export const PROFILE_VIDEO_CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.3gp': 'video/3gpp',
  '.3g2': 'video/3gpp2',
};

/** Voice-note upload limits for messaging. */
export const VOICE_AUDIO_MAX_BYTES = 10 * 1024 * 1024;
export const VOICE_AUDIO_RATE_LIMIT = { max: 30, timeWindow: '1 hour' };

export const ALLOWED_VOICE_AUDIO_MIMES = [
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
];

export const VOICE_AUDIO_CONTENT_TYPES: Record<string, string> = {
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
};

/** Default page size for conversation message history. */
export const MESSAGES_PAGE_SIZE = 50;
export const MESSAGES_PAGE_SIZE_MAX = 100;

/** Valid star-rating bounds for POST /profiles/:id/rating. */
export const MIN_RATING = 1;
export const MAX_RATING = 5;

/**
 * IP geolocation / reverse-geocode proxy limits.
 * Stricter than the global 100/min budget because each call fans out to upstream providers.
 */
export const GEOLOCATION_RATE_LIMIT = { max: 20, timeWindow: '1 minute' };

/** Upstream fetch timeouts (ms). */
export const IP_GEOLOCATION_TIMEOUT_MS = Number(process.env.IP_GEOLOCATION_TIMEOUT_MS || 5_000);
export const REVERSE_GEOCODE_TIMEOUT_MS = Number(process.env.REVERSE_GEOCODE_TIMEOUT_MS || 8_000);

/** Nominatim requires a descriptive User-Agent. */
export const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT || 'MatchyPlus/1.0 (contact@matchyplus.com)';
