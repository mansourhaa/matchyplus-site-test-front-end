import { describe, expect, it, vi } from 'vitest';

import { hashPassword } from '../lib/password.js';
import { hashVerificationCode } from '../lib/verification-code.js';
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

  describe('loginWithPhone', () => {
    it('logs in a verified phone user with the correct password', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+33612345678',
        password: await hashPassword('password123'),
        phone_verified: true,
        status: 'ACTIVE',
      });

      const issueTokenPairSpy = vi
        .spyOn(TokenService.prototype, 'issueTokenPair')
        .mockResolvedValue({ accessToken: 'access-token', refreshToken: 'refresh-token' });

      const result = await service.loginWithPhone({
        phone: '+33612345678',
        password: 'password123',
      });

      expect(result.accessToken).toBe('access-token');
      issueTokenPairSpy.mockRestore();
    });

    it('rejects a correct password with a distinct phone_not_verified error', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+33612345678',
        password: await hashPassword('password123'),
        phone_verified: false,
        status: 'ACTIVE',
      });

      await expect(
        service.loginWithPhone({ phone: '+33612345678', password: 'password123' }),
      ).rejects.toThrow('phone_not_verified');
    });

    it('rejects an unknown phone with the generic invalid_credentials error', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.loginWithPhone({ phone: '+33612345678', password: 'password123' }),
      ).rejects.toThrow('invalid_credentials');
    });

    it('rejects a wrong password with the generic invalid_credentials error, not phone_not_verified', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+33612345678',
        password: await hashPassword('password123'),
        phone_verified: false,
        status: 'ACTIVE',
      });

      await expect(
        service.loginWithPhone({ phone: '+33612345678', password: 'wrong-password' }),
      ).rejects.toThrow('invalid_credentials');
    });

    it('rejects a social-only account (no password) with a distinct oauth_only_account error', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+33612345678',
        password: null,
        phone_verified: true,
        auth_provider: 'google',
        status: 'ACTIVE',
      });

      await expect(
        service.loginWithPhone({ phone: '+33612345678', password: 'password123' }),
      ).rejects.toThrow('oauth_only_account');
    });
  });

  describe('registerWithPhone', () => {
    it('consumes the signup grant and creates a verified phone account', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        phone: '+33612345678',
        auth_provider: 'phone',
        phone_verified: true,
        status: 'ACTIVE',
      });

      const issueTokenPairSpy = vi
        .spyOn(TokenService.prototype, 'issueTokenPair')
        .mockResolvedValue({ accessToken: 'access-token', refreshToken: 'refresh-token' });

      const result = await service.registerWithPhone({
        phone: '+33 6 12 34 56 78',
        password: 'password123',
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

      issueTokenPairSpy.mockRestore();
    });

    it('rejects an invalid or already-consumed signup grant without creating a user', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.registerWithPhone({
          phone: '+33612345678',
          password: 'password123',
          signupToken: 'bad-token',
        }),
      ).rejects.toThrow('invalid_signup_grant');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects when the phone was registered by someone else after the grant was issued', async () => {
      const { service, prisma } = createService();
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue({ id: 'other-user', phone: '+33612345678' });

      await expect(
        service.registerWithPhone({
          phone: '+33612345678',
          password: 'password123',
          signupToken: 'valid-grant-token',
        }),
      ).rejects.toThrow('phone_already_registered');
      expect(prisma.user.create).not.toHaveBeenCalled();
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
        .spyOn(TokenService.prototype, 'revokeAllRefreshTokens')
        .mockResolvedValue(undefined);

      const result = await service.confirmPasswordReset({
        phone: '+33612345678',
        code: '123456',
        newPassword: 'new-password-123',
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
          newPassword: 'new-password-123',
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
  });
});
