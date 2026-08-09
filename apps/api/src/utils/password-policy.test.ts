import { describe, expect, it } from 'vitest';

import {
  assertPasswordPolicy,
  getPasswordRequirementStatus,
  isPasswordPolicySatisfied,
} from './password-policy.js';

describe('password policy', () => {
  it('accepts a password that meets every rule', () => {
    expect(isPasswordPolicySatisfied('Password123!')).toBe(true);
    expect(() => assertPasswordPolicy('Password123!')).not.toThrow();
  });

  it('rejects passwords missing any required class', () => {
    expect(isPasswordPolicySatisfied('short')).toBe(false);
    expect(isPasswordPolicySatisfied('password123!')).toBe(false); // no uppercase
    expect(isPasswordPolicySatisfied('PASSWORD123!')).toBe(false); // no lowercase
    expect(isPasswordPolicySatisfied('Password!!!!')).toBe(false); // no digit
    expect(isPasswordPolicySatisfied('Password123')).toBe(false); // no special
  });

  it('exposes per-rule status for the UI checklist', () => {
    expect(getPasswordRequirementStatus('Abcdef1!')).toEqual({
      minLength: true,
      lowercase: true,
      uppercase: true,
      digit: true,
      special: true,
    });
  });

  it('throws weak_password from assertPasswordPolicy', () => {
    expect(() => assertPasswordPolicy('weak')).toThrow('weak_password');
  });
});
