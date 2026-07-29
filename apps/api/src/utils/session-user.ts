type SessionUserSource = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  auth_provider: string;
  email_verified: boolean;
  onboarding_completed_at: Date | null;
};

export type MemberSessionUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  auth_provider: string;
  email_verified: boolean;
  onboarding_completed: boolean;
};

/**
 * Every route that hands a user object back to the SPA after minting a session
 * (login-phone, register-phone, oauth/exchange) must return this shape — never the raw
 * Prisma row, which carries the password hash and a raw `onboarding_completed_at`
 * timestamp instead of the boolean `AuthUser.onboarding_completed` the frontend reads.
 */
export function toMemberSessionUser(user: SessionUserSource): MemberSessionUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    auth_provider: user.auth_provider,
    email_verified: user.email_verified,
    onboarding_completed: Boolean(user.onboarding_completed_at),
  };
}
