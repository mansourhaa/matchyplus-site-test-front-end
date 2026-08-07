export type AdminRole = 'SUPER_ADMIN' | 'MODERATOR' | 'SUPPORT';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminAuthState {
  loading: boolean;
  error: string | null;
  /** No token field: the admin session is an HttpOnly cookie the client cannot read. */
  admin: AdminUser | null;
  loginAt: string | null;
  /** Dedicated status for the password change so it never collides with the login flow. */
  passwordChangeLoading: boolean;
  passwordChangeError: string | null;
}

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminPasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}
