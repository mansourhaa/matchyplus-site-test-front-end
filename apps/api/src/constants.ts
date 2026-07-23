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
