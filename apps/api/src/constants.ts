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

export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}

/** Role hierarchy, lowest to highest. Used to keep a role from acting on its peers or superiors. */
export const ROLE_RANK: Record<Role, number> = {
  [Role.USER]: 0,
  [Role.SUPPORT]: 1,
  [Role.MODERATOR]: 2,
  [Role.SUPER_ADMIN]: 3,
};

/** True when `actor` sits strictly above `target` in the hierarchy. */
export function outranks(actor: Role, target: Role): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

/** Every role `actor` sits strictly above. */
export function rolesBelow(actor: Role): Role[] {
  return (Object.keys(ROLE_RANK) as Role[]).filter((role) => outranks(actor, role));
}

/**
 * An error carrying its HTTP status, the shape `set-error-handler`
 * turns into a response.
 */
function httpError(statusCode: number, message: string): Error & { statusCode?: number } {
  const error: Error & { statusCode?: number } = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/** The request itself is malformed or breaks a rule of the domain. */
export function badRequest(message: string): Error & { statusCode?: number } {
  return httpError(400, message);
}

/** The row does not exist, or the caller may not know whether it does. */
export function notFound(message: string): Error & { statusCode?: number } {
  return httpError(404, message);
}

/** The caller is authenticated but not allowed to do this. */
export function forbidden(message: string): Error & { statusCode?: number } {
  return httpError(403, message);
}

/** The request clashes with something that already exists. */
export function conflict(message: string): Error & { statusCode?: number } {
  return httpError(409, message);
}

export function insufficientPrivileges(): Error & {
  statusCode?: number;
} {
  return forbidden('insufficient privileges');
}

/**
 * Guards an action that has no second account to compare against.
 */
export function assertMinimumRole(actor: Role, minimum: Role): void {
  if (ROLE_RANK[actor] < ROLE_RANK[minimum]) {
    throw insufficientPrivileges();
  }
}
