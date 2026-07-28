export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  auth_provider: string;
  email_verified: boolean;
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
  reason?: string;
}

export interface ExchangeOAuthCodeInput {
  code: string;
}
