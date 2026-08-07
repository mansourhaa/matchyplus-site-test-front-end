import { describe, expect, it } from 'vitest';

import { loginPhoneSchema, registerPhoneSchema, sendOtpSchema, verifyOtpSchema } from './schemas';

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
  const signupToken = 'a'.repeat(20);

  it('accepts a valid phone, password, and signup token', () => {
    expect(
      registerPhoneSchema.safeParse({
        phone: '+21612345678',
        password: 'secret123',
        signupToken,
      }).success,
    ).toBe(true);
  });

  it('accepts an optional name', () => {
    expect(
      registerPhoneSchema.safeParse({
        phone: '+21612345678',
        password: 'secret123',
        signupToken,
        name: 'Jane Doe',
      }).success,
    ).toBe(true);
  });

  // register-phone requires the signup grant proving a verified OTP (see /otp/verify) —
  // registration must not be submittable without one.
  it('rejects a missing signup token', () => {
    expect(
      registerPhoneSchema.safeParse({ phone: '+21612345678', password: 'secret123' }).success,
    ).toBe(false);
  });

  it('rejects a signup token shorter than 16 characters', () => {
    expect(
      registerPhoneSchema.safeParse({
        phone: '+21612345678',
        password: 'secret123',
        signupToken: 'short',
      }).success,
    ).toBe(false);
  });
});
