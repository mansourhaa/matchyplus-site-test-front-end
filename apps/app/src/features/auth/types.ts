export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  auth_provider: string;
  email_verified: boolean;
  phone_verified?: boolean;
  google_linked?: boolean;
  linkedin_linked?: boolean;
  /** Face-match identity badge, set once VERIFY_IDENTITY confirms a selfie match. */
  verified?: boolean;
  /** True when the account has a password (required for delete without OTP step-up). */
  has_password?: boolean;
  onboarding_completed: boolean;
  role?: string;
  plan?: string;
}

// Both session tokens live in HttpOnly cookies the browser attaches automatically —
// neither is ever readable from this app's own code, so "authenticated" can only be
// known by asking the API (see fetchCurrentUser / useBootstrapSession), not by checking
// a token value. 'unknown' is the state before that first check resolves.
export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  loading: boolean;
  error: string | null;
  user: AuthUser | null;
  // True once a session has been confirmed real this page load — either the bootstrap
  // fetchCurrentUser/authcheck settling, or any interactive session-establishing success
  // (login, register, OAuth exchange). redux-persist can rehydrate a stale
  // `status: 'authenticated'` before that happens — code that must not act on an
  // unconfirmed session (e.g. opening a realtime socket, or honoring a deep-linked
  // onboarding step) should gate on `sessionChecked`, not on `status` alone. Deliberately
  // excluded from persistence (see the nested persistReducer in store/root-reducer.ts) so
  // it always starts false again on the next page load.
  sessionChecked: boolean;
  // Bumped every time the session identity actually changes (applySession/clearSession).
  // fetchCurrentUser captures this when it starts; the bootstrap authcheck fires on every
  // page load and can still be in flight when a fresh visitor finishes phone signup on
  // /onboarding — if it settles after that, its result no longer reflects the current
  // session and must be discarded rather than clearing (or overwriting) the session that
  // was established since.
  sessionGeneration: number;
}

export interface SendOtpInput {
  phone: string;
}

export interface VerifyOtpInput {
  phone: string;
  code: string;
}

export interface LoginPhoneInput {
  phone: string;
  password: string;
}

export interface RegisterPhoneInput {
  phone: string;
  password: string;
  signupToken: string;
  name?: string;
}

export interface RequestPasswordResetInput {
  phone: string;
}

export interface ConfirmPasswordResetInput {
  phone: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface RequestPhoneLinkInput {
  phone: string;
}

export interface ConfirmPhoneLinkInput {
  phone: string;
  code: string;
}

export interface DeleteAccountInput {
  confirm: boolean;
  currentPassword?: string;
  otpCode?: string;
  reason?: string;
}

export interface ExchangeOAuthCodeInput {
  code: string;
}
