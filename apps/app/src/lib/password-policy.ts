/**
 * Keep in sync with apps/api `utils/password-policy.ts`.
 * Used for signup / reset / change-password only — not login.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export type PasswordRequirementId = 'minLength' | 'lowercase' | 'uppercase' | 'digit' | 'special';

export type PasswordRequirementStatus = Record<PasswordRequirementId, boolean>;

export const PASSWORD_REQUIREMENT_ORDER: PasswordRequirementId[] = [
  'minLength',
  'lowercase',
  'uppercase',
  'digit',
  'special',
];

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
