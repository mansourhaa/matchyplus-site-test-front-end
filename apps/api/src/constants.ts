import { Role } from '@saas-boilerplate/types';

export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

export const azureAdminUsername = 'azureuser';

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

/** Every role `actor` sits strictly above: the set they may act on, and the set they may see. */
export function rolesBelow(actor: Role): Role[] {
  return (Object.keys(ROLE_RANK) as Role[]).filter((role) => outranks(actor, role));
}

/**
 * 403 shaped the way the error handler expects, so a refused action answers with the status
 * instead of falling through to a 500.
 */
export function insufficientPrivileges(): Error & { statusCode?: number } {
  const error: Error & { statusCode?: number } = new Error('insufficient privileges');
  error.statusCode = 403;
  return error;
}

/**
 * Guards an action that has no second account to compare against — plan configuration, report
 * moderation — against a fixed floor in the hierarchy. Same ranking as `outranks`; `verifyAdmin`
 * only proves the caller is *an* admin, which is not enough for the control plane.
 */
export function assertMinimumRole(actor: Role, minimum: Role): void {
  if (ROLE_RANK[actor] < ROLE_RANK[minimum]) {
    throw insufficientPrivileges();
  }
}
