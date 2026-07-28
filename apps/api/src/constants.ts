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
