const DEFAULT_POST_AUTH_ROUTE = '/home';
const REGISTER_ROUTE = '/inscription';

// Routes that must never be treated as a valid post-auth destination — bouncing back
// into one of these would loop the user through the auth flow again.
const DISALLOWED_PREFIXES = [
  '/connexion',
  '/login',
  '/inscription',
  '/register',
  '/oauth-callback',
  '/api',
  '/onboarding',
];

function sanitizeNext(nextParam?: string | null): string | null {
  if (!nextParam) return null;

  const trimmed = nextParam.trim();
  const isSafe =
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !DISALLOWED_PREFIXES.some((prefix) => trimmed.startsWith(prefix));

  return isSafe ? trimmed : null;
}

/**
 * Where to send the user right after login/OTP-verify/register/OAuth. A safe `next`
 * param is honored once the profile is complete; an incomplete profile always goes to
 * registration first — a crafted `next` link can never be used to skip it — carrying the
 * original safe `next` (if any) through as registration's own post-completion destination.
 */
export function resolvePostAuthDestination(
  nextParam: string | null | undefined,
  onboardingCompleted: boolean,
): string {
  const safeNext = sanitizeNext(nextParam);

  if (!onboardingCompleted) {
    return safeNext ? `${REGISTER_ROUTE}?next=${encodeURIComponent(safeNext)}` : REGISTER_ROUTE;
  }

  return safeNext ?? DEFAULT_POST_AUTH_ROUTE;
}
