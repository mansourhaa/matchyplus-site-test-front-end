const DEFAULT_POST_AUTH_ROUTE = '/';

// Routes that must never be treated as a valid post-auth destination — bouncing back
// into one of these would loop the user through the auth flow again.
const DISALLOWED_PREFIXES = ['/login', '/register', '/oauth-callback', '/api'];

/**
 * TODO(profile-completeness): once GET /auth/authcheck exposes a profile-completeness
 * signal, branch here — complete profile -> DEFAULT_POST_AUTH_ROUTE, incomplete -> the
 * onboarding route. Until that contract exists, everyone lands on the default route
 * unless a safe `next` param says otherwise. Do not guess completeness from unrelated
 * AuthUser fields (auth_provider, email_verified, name) — that would misroute real
 * accounts that just happen to lack one of those fields for unrelated reasons.
 */
export function resolvePostAuthDestination(nextParam?: string | null): string {
  if (!nextParam) return DEFAULT_POST_AUTH_ROUTE;

  const trimmed = nextParam.trim();
  const isSafe =
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !DISALLOWED_PREFIXES.some((prefix) => trimmed.startsWith(prefix));

  return isSafe ? trimmed : DEFAULT_POST_AUTH_ROUTE;
}
