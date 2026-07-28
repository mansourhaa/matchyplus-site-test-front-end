import { Role } from '@saas-boilerplate/types';

import { ADMIN_ROLES, ROLE_RANK } from '../constants.js';
import { insufficientPrivileges } from './http-errors.js';

export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}

/** True when `actor` sits strictly above `target` in the hierarchy. */
export function outranks(actor: Role, target: Role): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

/** Every role `actor` sits strictly above: the set they may act on, and the set they may see. */
export function rolesBelow(actor: Role): Role[] {
  return (Object.keys(ROLE_RANK) as Role[]).filter((role) => outranks(actor, role));
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
