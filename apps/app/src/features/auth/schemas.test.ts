import { describe, expect, it } from 'vitest';

import {
  loginPhoneSchema,
  loginSchema,
  registerPhoneSchema,
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from './schemas';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects short passwords', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
  });
});

describe('sendOtpSchema', () => {
  it('accepts a valid phone number', () => {
    expect(sendOtpSchema.safeParse({ phone: '+21612345678' }).success).toBe(true);
  });

  it('rejects a phone number that is too short', () => {
    expect(sendOtpSchema.safeParse({ phone: '123' }).success).toBe(false);
  });

  it('rejects a missing phone number', () => {
    expect(sendOtpSchema.safeParse({}).success).toBe(false);
  });
});

describe('verifyOtpSchema', () => {
  it('accepts a valid phone and code', () => {
    expect(verifyOtpSchema.safeParse({ phone: '+21612345678', code: '123456' }).success).toBe(true);
  });

  it('rejects a code shorter than 4 characters', () => {
    expect(verifyOtpSchema.safeParse({ phone: '+21612345678', code: '12' }).success).toBe(false);
  });

  it('rejects a code longer than 10 characters', () => {
    expect(verifyOtpSchema.safeParse({ phone: '+21612345678', code: '12345678901' }).success).toBe(
      false,
    );
  });

  it('rejects a missing code', () => {
    expect(verifyOtpSchema.safeParse({ phone: '+21612345678' }).success).toBe(false);
  });
});

describe('loginPhoneSchema', () => {
  it('accepts a valid phone and password', () => {
    expect(
      loginPhoneSchema.safeParse({ phone: '+21612345678', password: 'secret123' }).success,
    ).toBe(true);
  });

  it('rejects a password shorter than 6 characters', () => {
    expect(loginPhoneSchema.safeParse({ phone: '+21612345678', password: 'short' }).success).toBe(
      false,
    );
  });

  it('rejects a phone number that is too short', () => {
    expect(loginPhoneSchema.safeParse({ phone: '123', password: 'secret123' }).success).toBe(false);
  });
});

describe('registerPhoneSchema', () => {
  it('accepts a valid phone, password, and code', () => {
    expect(
      registerPhoneSchema.safeParse({
        phone: '+21612345678',
        password: 'secret123',
        code: '123456',
      }).success,
    ).toBe(true);
  });

  it('accepts an optional name', () => {
    expect(
      registerPhoneSchema.safeParse({
        phone: '+21612345678',
        password: 'secret123',
        code: '123456',
        name: 'Jane Doe',
      }).success,
    ).toBe(true);
  });

  // The API contract for POST /auth/register-phone requires a verified OTP `code` —
  // registration must not be submittable without one.
  it('rejects a missing code', () => {
    expect(
      registerPhoneSchema.safeParse({ phone: '+21612345678', password: 'secret123' }).success,
    ).toBe(false);
  });

  it('rejects a code shorter than 4 characters', () => {
    expect(
      registerPhoneSchema.safeParse({
        phone: '+21612345678',
        password: 'secret123',
        code: '12',
      }).success,
    ).toBe(false);
  });
});
