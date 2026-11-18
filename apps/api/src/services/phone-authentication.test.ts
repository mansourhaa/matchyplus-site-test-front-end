import { describe, expect, it, vi } from 'vitest';

import { hashPassword } from '../lib/password.js';
import { hashVerificationCode } from '../lib/verification-code.js';
import { hashActivationToken } from '../utils/activation-token.js';
import { PhoneAuthenticationService } from './phone-authentication.js';
import { TokenService } from './token.js';

function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    otpChallenge: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

function createService(prisma = createMockPrisma(), smsOverrides: Record<string, unknown> = {}) {
  const smsClient = {
    sendSms: vi.fn().mockResolvedValue(undefined),
    ...smsOverrides,
  };
  const logger = { warn: vi.fn() };
  const service = new PhoneAuthenticationService({
    prisma: prisma as never,
    smsClient: smsClient as never,
    logger,
  });
  return { service, prisma, smsClient, logger };
}

describe('PhoneAuthenticationService', () => {
  describe('sendOtp', () => {
    it('creates a SIGNUP_VERIFICATION challenge and sends it by SMS', async () => {
      const { service, prisma, smsClient } = createService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      const result = await service.sendOtp({ phone: '+33 6 12 34 56 78' });

      expect(prisma.otpChallenge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: '+33612345678',
          purpose: 'SIGNUP_VERIFICATION',
        }),
      });
      expect(smsClient.sendSms).toHaveBeenCalledWith('+33612345678', expect.any(String));
      expect(result).toEqual({ message: 'otp_sent', phone: '+33612345678' });
    });

    it('rejects a phone that is already registered without sending an OTP', async () => {
      const { service, prisma, smsClient } = createService();
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', phone: '+33612345678' });

      await expect(service.sendOtp({ phone: '+33 6 12 34 56 78' })).rejects.toThrow(
        'phone_already_registered',
      );
      expect(prisma.otpChallenge.create).not.toHaveBeenCalled();
      expect(smsClient.sendSms).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('proves phone ownership and returns a signup grant, without creating a user', async () => {
      const { service, prisma } = createService();
      const challenge = {
        id: 'challenge-1',
        expires_at: new Date(Date.now() + 60_000),
        attempts: 0,
        code_hash: hashVerificationCode('123456'),
      };
      prisma.otpChallenge.findFirst.mockResolvedValue(challenge);
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.verifyOtp({ phone: '06 12 34 56 78', code: '123456' });

      expect(result.verified).toBe(true);
      expect(result.phone).toBe('+0612345678');
      expect(result.signupToken).toBeTypeOf('string');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid code without issuing a grant', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      await expect(service.verifyOtp({ phone: '+33612345678', code: '123456' })).rejects.toThrow(
        'invalid_otp',
      );
      expect(prisma.otpChallenge.update).not.toHaveBeenCalled();
    });
  });

  describe('sendLoginOtp', () => {
    it('creates a PHONE_LOGIN challenge and sends it by SMS for an active phone user', async () => {
      const { service, prisma, smsClient } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+33612345678',
        status: 'ACTIVE',
      });
      prisma.otpChallenge.findFirst.mockResolvedValue(null);
      prisma.otpChallenge.create.mockResolvedValue({});

      const result = await service.sendLoginOtp({ phone: '+33 6 12 34 56 78' });

      expect(result).toEqual({ message: 'otp_sent', phone: '+33612345678' });
      expect(prisma.otpChallenge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: '+33612345678',
          purpose: 'PHONE_LOGIN',
          user_id: 'user-1',
        }),
      });
      expect(smsClient.sendSms).toHaveBeenCalledTimes(1);
    });

    it('rejects an unregistered phone with phone_not_found', async () => {
      const { service, prisma, smsClient } = createService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.sendLoginOtp({ phone: '+33612345678' })).rejects.toThrow(
        'phone_not_found',
      );
      expect(smsClient.sendSms).not.toHaveBeenCalled();
    });
  });

  describe('loginWithPhone', () => {
    it('logs in a phone user with a valid OTP code', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'chal-1',
        phone: '+33612345678',
        purpose: 'PHONE_LOGIN',
        code_hash: hashVerificationCode('123456'),
        attempts: 0,
        expires_at: new Date(Date.now() + 60_000),
        consumed_at: null,
      });
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: null,
        phone: '+33612345678',
        name: 'Jane Doe',
        password: null,
        auth_provider: 'phone',
        email_verified: false,
        phone_verified: true,
        must_change_password: false,
        status: 'ACTIVE',
        onboarding_completed_at: null,
      });

      const issueTokenPairSpy = vi
        .spyOn(TokenService.prototype, 'issueTokenPair')
        .mockResolvedValue({ accessToken: 'access-token', refreshToken: 'refresh-token' });

      const result = await service.loginWithPhone({
        phone: '+33612345678',
        code: '123456',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.user).toEqual({
        id: 'user-1',
        email: null,
        phone: '+33612345678',
        name: 'Jane Doe',
        image: null,
        auth_provider: 'phone',
        email_verified: false,
        phone_verified: true,
        google_linked: false,
        linkedin_linked: false,
        has_password: false,
        onboarding_completed: false,
      });
      issueTokenPairSpy.mockRestore();
    });

    it('rejects an invalid OTP code with invalid_otp', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      await expect(
        service.loginWithPhone({ phone: '+33612345678', code: '123456' }),
      ).rejects.toThrow('invalid_otp');
    });

    it('rejects a BANNED account with account_banned', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'chal-1',
        phone: '+33612345678',
        purpose: 'PHONE_LOGIN',
        code_hash: hashVerificationCode('123456'),
        attempts: 0,
        expires_at: new Date(Date.now() + 60_000),
        consumed_at: null,
      });
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+33612345678',
        password: null,
        phone_verified: true,
        must_change_password: false,
        status: 'BANNED',
      });

      await expect(
        service.loginWithPhone({ phone: '+33612345678', code: '123456' }),
      ).rejects.toThrow('account_banned');
    });

    it('rejects a deactivated INACTIVE account (without pending activation) with account_inactive', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'chal-1',
        phone: '+33612345678',
        purpose: 'PHONE_LOGIN',
        code_hash: hashVerificationCode('123456'),
        attempts: 0,
        expires_at: new Date(Date.now() + 60_000),
        consumed_at: null,
      });
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+33612345678',
        password: null,
        phone_verified: true,
        must_change_password: false,
        status: 'INACTIVE',
      });

      await expect(
        service.loginWithPhone({ phone: '+33612345678', code: '123456' }),
      ).rejects.toThrow('account_inactive');
    });

    it('activates a pending admin-created lead on valid OTP login', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'chal-1',
        phone: '+33612345678',
        purpose: 'PHONE_LOGIN',
        code_hash: hashVerificationCode('123456'),
        attempts: 0,
        expires_at: new Date(Date.now() + 60_000),
        consumed_at: null,
      });
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-cold',
        phone: '+33612345678',
        name: 'Lead',
        email: null,
        password: null,
        auth_provider: 'phone',
        email_verified: false,
        must_change_password: true,
        phone_verified: true,
        status: 'INACTIVE',
        onboarding_completed_at: new Date(),
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-cold',
        phone: '+33612345678',
        name: 'Lead',
        email: null,
        password: null,
        auth_provider: 'phone',
        email_verified: false,
        must_change_password: false,
        phone_verified: true,
        status: 'ACTIVE',
        onboarding_completed_at: new Date(),
      });
      const issueTokenPairSpy = vi
        .spyOn(TokenService.prototype, 'issueTokenPair')
        .mockResolvedValue({ accessToken: 'access-token', refreshToken: 'refresh-token' });

      const result = await service.loginWithPhone({
        phone: '+33612345678',
        code: '123456',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-cold' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          must_change_password: false,
          phone_verified: true,
        }),
      });
      expect(result.accessToken).toBe('access-token');
      issueTokenPairSpy.mockRestore();
    });
  });

  describe('registerWithPhone', () => {
    it('consumes the signup grant and creates a verified phone account', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: null,
        phone: '+33612345678',
        name: '+33612345678',
        auth_provider: 'phone',
        email_verified: false,
        phone_verified: true,
        status: 'ACTIVE',
        onboarding_completed_at: null,
      });

      const issueTokenPairSpy = vi
        .spyOn(TokenService.prototype, 'issueTokenPair')
        .mockResolvedValue({ accessToken: 'access-token', refreshToken: 'refresh-token' });

      const result = await service.registerWithPhone({
        phone: '+33 6 12 34 56 78',
        signupToken: 'valid-grant-token',
      });

      expect(prisma.otpChallenge.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          phone: '+33612345678',
          purpose: 'SIGNUP_VERIFICATION',
          grant_consumed_at: null,
        }),
        data: { grant_consumed_at: expect.any(Date) },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: '+33612345678',
          auth_provider: 'phone',
          phone_verified: true,
        }),
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.user).toEqual({
        id: 'user-1',
        email: null,
        phone: '+33612345678',
        name: '+33612345678',
        image: null,
        auth_provider: 'phone',
        email_verified: false,
        phone_verified: true,
        google_linked: false,
        linkedin_linked: false,
        has_password: false,
        onboarding_completed: false,
      });

      issueTokenPairSpy.mockRestore();
    });

    it('rejects an invalid or already-consumed signup grant without creating a user', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.registerWithPhone({
          phone: '+33612345678',
          signupToken: 'bad-token',
        }),
      ).rejects.toThrow('invalid_signup_grant');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects when the phone is already registered, without burning the signup grant', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue({ id: 'other-user', phone: '+33612345678' });

      await expect(
        service.registerWithPhone({
          phone: '+33612345678',
          signupToken: 'valid-grant-token',
        }),
      ).rejects.toThrow('phone_already_registered');
      expect(prisma.user.create).not.toHaveBeenCalled();
      // The duplicate-phone check must run before consuming the grant — otherwise a
      // failed registration would burn a one-time signup grant for nothing, forcing the
      // user back through the whole OTP flow to retry.
      expect(prisma.otpChallenge.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('returns a uniform success response for an unknown phone without sending anything', async () => {
      const { service, prisma, smsClient } = createService();
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset({ phone: '+33 6 12 34 56 78' });

      expect(result).toEqual({ message: 'reset_code_sent' });
      expect(smsClient.sendSms).not.toHaveBeenCalled();
    });

    it('returns a uniform success response for a passwordless user without sending anything', async () => {
      const { service, prisma, smsClient } = createService();
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', phone: '+33612345678' });

      const result = await service.requestPasswordReset({ phone: '+33 6 12 34 56 78' });

      expect(result).toEqual({ message: 'reset_code_sent' });
      expect(smsClient.sendSms).not.toHaveBeenCalled();
    });

    it('creates a PASSWORD_RESET challenge and sends it for a passworded user', async () => {
      const { service, prisma, smsClient } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+33612345678',
        password: 'hashed-password',
      });
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      const result = await service.requestPasswordReset({ phone: '+33 6 12 34 56 78' });

      expect(result).toEqual({ message: 'reset_code_sent' });
      expect(prisma.otpChallenge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ phone: '+33612345678', purpose: 'PASSWORD_RESET' }),
      });
      expect(smsClient.sendSms).toHaveBeenCalledWith('+33612345678', expect.any(String));
    });

    it('returns a uniform success response even when SMS delivery fails, but logs the failure', async () => {
      const { service, prisma, logger } = createService(createMockPrisma(), {
        sendSms: vi.fn().mockRejectedValue(new Error('sms-down')),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+33612345678',
        password: 'hashed-password',
      });
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      const result = await service.requestPasswordReset({ phone: '+33 6 12 34 56 78' });

      expect(result).toEqual({ message: 'reset_code_sent' });
      // Anti-enumeration means the caller can never learn delivery failed — but that
      // failure must not vanish outright, or a real SMS outage looks like silence.
      expect(logger.warn).toHaveBeenCalledWith(
        { err: expect.objectContaining({ message: 'sms-down' }), phone: '+33612345678' },
        'password_reset_challenge_or_delivery_failed',
      );
    });

    it('returns a uniform success response even when challenge creation fails, but logs the failure', async () => {
      const { service, prisma, logger } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+33612345678',
        password: 'hashed-password',
      });
      // An already-active, very recent challenge trips the resend cooldown inside
      // createChallenge — a real operational failure distinct from SMS delivery.
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'challenge-1',
        create_at: new Date(),
      });

      const result = await service.requestPasswordReset({ phone: '+33 6 12 34 56 78' });

      expect(result).toEqual({ message: 'reset_code_sent' });
      expect(logger.warn).toHaveBeenCalledWith(
        { err: expect.objectContaining({ message: 'otp_resend_too_soon' }), phone: '+33612345678' },
        'password_reset_challenge_or_delivery_failed',
      );
    });
  });

  describe('confirmPasswordReset', () => {
    it('resets the password, leaves auth_provider untouched, and revokes all sessions', async () => {
      const { service, prisma } = createService();
      const challenge = {
        id: 'challenge-1',
        expires_at: new Date(Date.now() + 60_000),
        attempts: 0,
        code_hash: hashVerificationCode('123456'),
      };
      prisma.otpChallenge.findFirst.mockResolvedValue(challenge);
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', phone: '+33612345678' });

      const revokeSpy = vi
        .spyOn(TokenService.prototype, 'revokeAllSessions')
        .mockResolvedValue(undefined);

      const result = await service.confirmPasswordReset({
        phone: '+33612345678',
        code: '123456',
        newPassword: 'Password123!',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: expect.any(String) },
      });
      expect(prisma.user.update.mock.calls[0]?.[0]?.data).not.toHaveProperty('auth_provider');
      expect(revokeSpy).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'password_reset' });

      revokeSpy.mockRestore();
    });

    it('rejects an invalid code without touching the password', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmPasswordReset({
          phone: '+33612345678',
          code: '000000',
          newPassword: 'Password123!',
        }),
      ).rejects.toThrow('invalid_otp');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('requestPhoneLink', () => {
    function eligiblePrisma() {
      const prisma = createMockPrisma();
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', auth_provider: 'linkedin', phone: null })
        .mockResolvedValueOnce(null);
      prisma.otpChallenge.findFirst.mockResolvedValue(null);
      return prisma;
    }

    it('rejects when the account was not created via a social provider', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        auth_provider: 'email',
        phone: null,
      });

      await expect(
        service.requestPhoneLink({ userId: 'user-1', phone: '+33612345678' }),
      ).rejects.toThrow('phone_link_not_allowed');
    });

    it('rejects when the account already has a linked phone', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        auth_provider: 'google',
        phone: '+33600000000',
      });

      await expect(
        service.requestPhoneLink({ userId: 'user-1', phone: '+33612345678' }),
      ).rejects.toThrow('phone_already_linked');
    });

    it('creates a PHONE_LINK challenge for an eligible social account', async () => {
      const prisma = eligiblePrisma();
      const { service, smsClient } = createService(prisma);

      const result = await service.requestPhoneLink({ userId: 'user-1', phone: '+33612345678' });

      expect(prisma.otpChallenge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ phone: '+33612345678', purpose: 'PHONE_LINK' }),
      });
      expect(smsClient.sendSms).toHaveBeenCalledWith('+33612345678', expect.any(String));
      expect(result).toEqual({ message: 'phone_link_code_sent', phone: '+33612345678' });
    });
  });

  describe('confirmPhoneLink', () => {
    it('re-checks eligibility instead of trusting the request-time check', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        auth_provider: 'google',
        phone: '+33699999999',
      });

      await expect(
        service.confirmPhoneLink({ userId: 'user-1', phone: '+33612345678', code: '123456' }),
      ).rejects.toThrow('phone_already_linked');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects an invalid OTP without linking the phone', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        auth_provider: 'google',
        phone: null,
      });
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmPhoneLink({ userId: 'user-1', phone: '+33612345678', code: '000000' }),
      ).rejects.toThrow('invalid_otp');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('links the phone and marks it verified once every check passes', async () => {
      const { service, prisma } = createService();
      const challenge = {
        id: 'challenge-1',
        user_id: 'user-1',
        expires_at: new Date(Date.now() + 60_000),
        attempts: 0,
        code_hash: hashVerificationCode('123456'),
      };
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', auth_provider: 'google', phone: null })
        .mockResolvedValueOnce(null);
      prisma.otpChallenge.findFirst.mockResolvedValue(challenge);
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.update.mockResolvedValue({ id: 'user-1', phone: '+33612345678' });

      const result = await service.confirmPhoneLink({
        userId: 'user-1',
        phone: '+33612345678',
        code: '123456',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { phone: '+33612345678', phone_verified: true },
      });
      expect(result).toEqual({ message: 'phone_linked', phone: '+33612345678' });
    });

    it('rejects when the phone was claimed by someone else between request and confirm', async () => {
      const { service, prisma } = createService();
      const challenge = {
        id: 'challenge-1',
        user_id: 'user-1',
        expires_at: new Date(Date.now() + 60_000),
        attempts: 0,
        code_hash: hashVerificationCode('123456'),
      };
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', auth_provider: 'google', phone: null })
        .mockResolvedValueOnce({ id: 'other-user', phone: '+33612345678' });
      prisma.otpChallenge.findFirst.mockResolvedValue(challenge);
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        service.confirmPhoneLink({ userId: 'user-1', phone: '+33612345678', code: '123456' }),
      ).rejects.toThrow('phone_already_registered');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects confirmation from a different account than the one that requested the challenge', async () => {
      const { service, prisma } = createService();
      const challenge = {
        id: 'challenge-1',
        user_id: 'user-1',
        expires_at: new Date(Date.now() + 60_000),
        attempts: 0,
        code_hash: hashVerificationCode('123456'),
      };
      // 'attacker' is itself an eligible social account with no phone — the hijack must
      // still be blocked purely by the challenge/caller mismatch, not by eligibility.
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'attacker',
        auth_provider: 'google',
        phone: null,
      });
      prisma.otpChallenge.findFirst.mockResolvedValue(challenge);

      await expect(
        service.confirmPhoneLink({ userId: 'attacker', phone: '+33612345678', code: '123456' }),
      ).rejects.toThrow('invalid_otp');
      expect(prisma.otpChallenge.updateMany).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('getActivationPreview', () => {
    it('returns preview profile data for an unactivated account', async () => {
      const { service, prisma } = createService();
      const rawToken = 'test-token-1234567890';
      const tokenHash = hashActivationToken(rawToken);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-lead',
        name: 'Sarra Ben Ali',
        phone: '+21620123456',
        image: 'https://example.com/sarra.jpg',
        job: 'Architecte',
        city: 'Tunis',
        category: 'Ingénierie',
        profile_type: 'INDIVIDUAL',
        must_change_password: true,
        activation_token_expires_at: new Date(Date.now() + 86400000),
        status: 'ACTIVE',
      });

      const result = await service.getActivationPreview(rawToken);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { activation_token_hash: tokenHash },
        select: expect.any(Object),
      });
      expect(result).toEqual({
        id: 'user-lead',
        name: 'Sarra Ben Ali',
        phone: '+21620123456',
        image: 'https://example.com/sarra.jpg',
        job: 'Architecte',
        city: 'Tunis',
        category: 'Ingénierie',
        profileType: 'INDIVIDUAL',
      });
    });

    it('rejects an expired activation token', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-lead',
        must_change_password: true,
        activation_token_expires_at: new Date(Date.now() - 1000),
      });

      await expect(service.getActivationPreview('expired-token')).rejects.toThrow(
        'invalid_activation_token',
      );
    });

    it('rejects when activation is already complete', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-lead',
        must_change_password: false,
        activation_token_expires_at: new Date(Date.now() + 86400000),
      });

      await expect(service.getActivationPreview('already-activated')).rejects.toThrow(
        'invalid_activation_token',
      );
    });

    it('resolves stored media photos to a base64 data URL', async () => {
      const { service, prisma } = createService();
      const rawToken = 'test-token-stored-media';
      const { mkdir, rm, writeFile } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const { randomUUID } = await import('node:crypto');
      const { PHOTOS_DIR } = await import('../utils/media-storage.js');

      await mkdir(PHOTOS_DIR, { recursive: true });
      const filename = `${randomUUID()}.png`;
      const filePath = join(PHOTOS_DIR, filename);
      const testBuffer = Buffer.from('fake-png-bytes');
      await writeFile(filePath, testBuffer);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-lead',
        name: 'Sarra Ben Ali',
        phone: '+21620123456',
        image: `/uploads/photos/${filename}`,
        job: 'Architecte',
        city: 'Tunis',
        category: 'Ingénierie',
        profile_type: 'INDIVIDUAL',
        must_change_password: true,
        activation_token_expires_at: new Date(Date.now() + 86400000),
        status: 'ACTIVE',
      });

      try {
        const result = await service.getActivationPreview(rawToken);
        expect(result.image).toBe(
          `data:image/png;base64,${testBuffer.toString('base64')}`,
        );
      } finally {
        await rm(filePath, { force: true });
      }
    });

    it('gracefully handles missing stored media photo file from disk', async () => {
      const { service, prisma } = createService();
      const rawToken = 'test-token-missing-media';

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-lead',
        name: 'Sarra Ben Ali',
        phone: '+21620123456',
        image: '/uploads/photos/22222222-2222-2222-2222-222222222222.jpg',
        job: 'Architecte',
        city: 'Tunis',
        category: 'Ingénierie',
        profile_type: 'INDIVIDUAL',
        must_change_password: true,
        activation_token_expires_at: new Date(Date.now() + 86400000),
        status: 'ACTIVE',
      });

      const result = await service.getActivationPreview(rawToken);
      expect(result.image).toBeNull();
    });
  });

  describe('sendActivationOtp', () => {
    it('sends a PHONE_LOGIN OTP to the pending activation user phone', async () => {
      const { service, prisma, smsClient } = createService();
      const rawToken = 'test-token-1234567890';
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-lead',
        name: 'Sarra Ben Ali',
        phone: '+21620123456',
        must_change_password: true,
        activation_token_expires_at: new Date(Date.now() + 86400000),
        status: 'INACTIVE',
      });
      prisma.otpChallenge.findFirst.mockResolvedValue(null);
      prisma.otpChallenge.create.mockResolvedValue({});

      const result = await service.sendActivationOtp(rawToken);

      expect(result).toEqual({ message: 'otp_sent', phone: '+21620123456' });
      expect(prisma.otpChallenge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: '+21620123456',
          purpose: 'PHONE_LOGIN',
          user_id: 'user-lead',
        }),
      });
      expect(smsClient.sendSms).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirmActivation', () => {
    it('verifies OTP, completes activation without password, and returns session tokens', async () => {
      const { service, prisma } = createService();
      const rawToken = 'test-token-1234567890';
      const tokenHash = hashActivationToken(rawToken);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-lead',
        name: 'Sarra Ben Ali',
        phone: '+21620123456',
        must_change_password: true,
        activation_token_expires_at: new Date(Date.now() + 86400000),
        status: 'INACTIVE',
      });
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'chal-act-1',
        phone: '+21620123456',
        purpose: 'PHONE_LOGIN',
        user_id: 'user-lead',
        code_hash: hashVerificationCode('123456'),
        attempts: 0,
        expires_at: new Date(Date.now() + 60_000),
        consumed_at: null,
      });
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });

      prisma.user.update.mockResolvedValue({
        id: 'user-lead',
        name: 'Sarra Ben Ali',
        phone: '+21620123456',
        email: null,
        auth_provider: 'phone',
        email_verified: false,
        phone_verified: true,
        status: 'ACTIVE',
        role: 'USER',
        plan: 'FREE',
        onboarding_completed_at: new Date(),
      });

      const issueTokenSpy = vi
        .spyOn(TokenService.prototype, 'issueTokenPair')
        .mockResolvedValue({ accessToken: 'access-123', refreshToken: 'refresh-123' });

      const result = await service.confirmActivation({
        token: rawToken,
        code: '123456',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { activation_token_hash: tokenHash },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-lead' },
        data: expect.objectContaining({
          password: null,
          must_change_password: false,
          activation_token_hash: null,
          activation_token_expires_at: null,
          phone_verified: true,
          status: 'ACTIVE',
        }),
      });
      expect(result.accessToken).toBe('access-123');
      expect(result.refreshToken).toBe('refresh-123');
      expect(result.user.id).toBe('user-lead');

      issueTokenSpy.mockRestore();
    });

    it('rejects activation when OTP code is missing or invalid', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-lead',
        name: 'Sarra Ben Ali',
        phone: '+21620123456',
        must_change_password: true,
        activation_token_expires_at: new Date(Date.now() + 86400000),
        status: 'INACTIVE',
      });
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmActivation({ token: 'test-token-1234567890', code: '000000' }),
      ).rejects.toThrow('invalid_otp');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('devOtp visibility by environment', () => {
    it('includes devOtp in development and omits it in production', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-lead',
        name: 'Sarra Ben Ali',
        phone: '+21620123456',
        must_change_password: true,
        activation_token_expires_at: new Date(Date.now() + 86400000),
        status: 'INACTIVE',
      });
      prisma.otpChallenge.findFirst.mockResolvedValue(null);
      prisma.otpChallenge.create.mockResolvedValue({});

      try {
        vi.stubEnv('NODE_ENV', 'development');
        const devResult = await service.sendActivationOtp('test-token-1234567890');
        expect(devResult.devOtp).toMatch(/^\d{6}$/);

        vi.stubEnv('NODE_ENV', 'production');
        const prodResult = await service.sendActivationOtp('test-token-1234567890');
        expect(prodResult).not.toHaveProperty('devOtp');
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });
});
