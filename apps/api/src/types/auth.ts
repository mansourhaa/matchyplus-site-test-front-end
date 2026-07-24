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

export type ForgotResult = {
  token: string;
  user: Partial<User>;
};
export type ForgotPayload = {
  email: string;
};

export type ResetPayload = {
  token: string;
  password: string;
};

export type RegisterPayload = {
  first_name: string;
  last_name: string;
  email: string;
  name: string;
  password: string;
};

export type RegisterResult = {};

export type ResetBody = {
  password: string;
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
export type VerifyOtpResult = {
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
};

export type LoginPhonePayload = {
  phone: string;
  password: string;
};

export type RegisterPhonePayload = {
  phone: string;
  password: string;
  code: string;
  name?: string;
};

export type RefreshPayload = {
  refresh_token: string;
};
export type RefreshResult = {
  accessToken: string;
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

export type RequestEmailVerificationPayload = {
  userId: string;
  email: string;
};
export type RequestEmailVerificationResult = {
  message: string;
  email: string;
};

export type ConfirmEmailVerificationPayload = {
  userId: string;
  code: string;
};
export type ConfirmEmailVerificationResult = {
  message: string;
  email: string;
  emailVerified: boolean;
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
  reason?: string;
};
export type DeleteAccountResult = {
  message: string;
};
