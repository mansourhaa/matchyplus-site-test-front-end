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

// For destructive, hard-to-undo actions (e.g. account deletion) — tighter than the
// 5/15min tier already used for OTP/email/phone-link "send" endpoints.
export const RATE_LIMIT_STRICT = { max: 3, timeWindow: '1 hour' };
