import { Prisma, User } from '@saas-boilerplate/types';

export type LoginResult = {
  accessToken: string;
  refreshToken?: string;
  user: Partial<User>;
};
export type AuthCheckResult = {
  user: Partial<User>;
};
export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthCheckPayload = {
  id: string;
};

export type SendOtpPayload = {
  phone: string;
};
export type SendOtpResult = {
  message: string;
  phone: string;
};

export type VerifyOtpPayload = {
  phone: string;
  code: string;
};
// Proves phone ownership only — never a login or account-creation result itself (see
// doc/features/authentication.md). `signupToken` is what register-phone consumes.
export type VerifyOtpResult = {
  verified: true;
  phone: string;
  signupToken: string;
};

export type LoginPhonePayload = {
  phone: string;
  password: string;
};

export type RegisterPhonePayload = {
  phone: string;
  password: string;
  signupToken: string;
  name?: string;
};

export type RequestPasswordResetPayload = {
  phone: string;
};
export type RequestPasswordResetResult = {
  message: string;
  phone: string;
};

export type ConfirmPasswordResetPayload = {
  phone: string;
  code: string;
  newPassword: string;
};
export type ConfirmPasswordResetResult = {
  message: string;
};

export type ChangePasswordPayload = {
  userId: string;
  currentPassword: string;
  newPassword: string;
};
export type ChangePasswordResult = {
  message: string;
  forceLogout: boolean;
};

export type RequestPhoneLinkPayload = {
  userId: string;
  phone: string;
};
export type RequestPhoneLinkResult = {
  message: string;
  phone: string;
};

export type ConfirmPhoneLinkPayload = {
  userId: string;
  phone: string;
  code: string;
};
export type ConfirmPhoneLinkResult = {
  message: string;
  phone: string;
};

export type OAuthProviderName = 'google' | 'linkedin';

export type OAuthProfilePayload = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  image?: string | null;
};

export type OAuthExchangePayload = {
  code: string;
};
export type OAuthExchangeResult = {
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
};

export type DeleteAccountPayload = {
  userId: string;
  confirm: boolean;
  currentPassword?: string;
  /** Required for passwordless accounts (ACCOUNT_DELETE OTP). */
  otpCode?: string;
  reason?: string;
};
export type DeleteAccountResult = {
  message: string;
};

export type ActivationPreviewQuery = {
  token: string;
};

export type ActivationPreviewResult = {
  id: string;
  name: string;
  phone: string;
  image: string | null;
  job: string | null;
  city: string | null;
  category: string | null;
  profileType: string | null;
};

export type ActivationConfirmPayload = {
  token: string;
  password: string;
};
