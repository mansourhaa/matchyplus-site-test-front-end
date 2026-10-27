export const INTRO_SEEN_KEY = 'matchy_onboarding_intro_seen';
export const INTRO_COOKIE_NAME = 'matchy_intro_seen';

const introListeners = new Set<() => void>();

export function subscribeIntro(callback: () => void) {
  introListeners.add(callback);
  return () => {
    introListeners.delete(callback);
  };
}

export function readStoredIntroSeen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const local = window.localStorage.getItem(INTRO_SEEN_KEY) === 'true';
    const hasCookie =
      typeof document !== 'undefined' &&
      document.cookie.split(';').some((item) => item.trim().startsWith(`${INTRO_COOKIE_NAME}=`));
    return local || hasCookie;
  } catch {
    return false;
  }
}

export function setStoredIntroSeen(seen: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (seen) {
      window.localStorage.setItem(INTRO_SEEN_KEY, 'true');
      if (typeof document !== 'undefined') {
        document.cookie = `${INTRO_COOKIE_NAME}=1; path=/; max-age=31536000; SameSite=Lax`;
      }
    } else {
      window.localStorage.removeItem(INTRO_SEEN_KEY);
      if (typeof document !== 'undefined') {
        document.cookie = `${INTRO_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      }
    }
  } catch {
    // Ignore storage quota/security errors
  }
  introListeners.forEach((listener) => listener());
}
