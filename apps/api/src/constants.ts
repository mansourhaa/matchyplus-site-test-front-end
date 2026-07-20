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
