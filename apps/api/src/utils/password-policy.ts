/**
 * Password rules for signup / reset / change-password.
 * Login must NOT use this — existing accounts may still have pre-policy passwords.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Characters accepted as "special" for the policy checklist. */
export const PASSWORD_SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export type PasswordRequirementId = 'minLength' | 'lowercase' | 'uppercase' | 'digit' | 'special';

export type PasswordRequirementStatus = Record<PasswordRequirementId, boolean>;

export function getPasswordRequirementStatus(password: string): PasswordRequirementStatus {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    special: PASSWORD_SPECIAL_CHARS.test(password),
  };
}

export function isPasswordPolicySatisfied(password: string): boolean {
  const status = getPasswordRequirementStatus(password);
  return Object.values(status).every(Boolean);
}

/** Throws `weak_password` when the password fails the policy. */
export function assertPasswordPolicy(password: string): void {
  if (!isPasswordPolicySatisfied(password)) {
    throw new Error('weak_password');
  }
}
