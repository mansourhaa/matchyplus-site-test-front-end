export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  auth_provider: string;
  email_verified: boolean;
}

export interface AuthState {
  loading: boolean;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
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

export interface RequestEmailVerificationInput {
  email: string;
}

export interface ConfirmEmailVerificationInput {
  code: string;
}

export interface RequestPhoneLinkInput {
  phone: string;
}

export interface ConfirmPhoneLinkInput {
  phone: string;
  code: string;
}

export interface DeleteAccountInput {
  password?: string;
  reason?: string;
}

export interface ExchangeOAuthCodeInput {
  code: string;
}
