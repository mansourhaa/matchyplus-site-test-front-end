import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OtpPurpose } from '@saas-boilerplate/types';

import { hashVerificationCode } from '../lib/verification-code.js';
import { OtpChallengeService } from './otp-challenge.js';

function createMockPrisma() {
  return {
    otpChallenge: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

describe('OtpChallengeService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: OtpChallengeService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new OtpChallengeService({ prisma: prisma as never });
  });

  describe('createChallenge', () => {
    it('creates a challenge with a hashed code when none is active', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      const code = await service.createChallenge('+21612345678', OtpPurpose.SIGNUP_VERIFICATION);

      expect(code).toMatch(/^\d{6}$/);
      expect(prisma.otpChallenge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: '+21612345678',
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
          code_hash: hashVerificationCode(code),
          user_id: null,
        }),
      });
    });

    it('rejects a resend within the cooldown window', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'challenge-1',
        create_at: new Date(),
      });

      await expect(
        service.createChallenge('+21612345678', OtpPurpose.SIGNUP_VERIFICATION),
      ).rejects.toThrow('otp_resend_too_soon');
      expect(prisma.otpChallenge.create).not.toHaveBeenCalled();
    });

    it('cancels a stale active challenge before creating a new one', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'challenge-1',
        create_at: new Date(Date.now() - 10 * 60 * 1000),
      });

      await service.createChallenge('+21612345678', OtpPurpose.SIGNUP_VERIFICATION);

      expect(prisma.otpChallenge.update).toHaveBeenCalledWith({
        where: { id: 'challenge-1' },
        data: { consumed_at: expect.any(Date) },
      });
      expect(prisma.otpChallenge.create).toHaveBeenCalled();
    });
  });

  describe('verifyChallenge', () => {
    it('throws invalid_otp when no active challenge exists', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyChallenge('+21612345678', OtpPurpose.SIGNUP_VERIFICATION, '123456'),
      ).rejects.toThrow('invalid_otp');
      expect(prisma.otpChallenge.updateMany).not.toHaveBeenCalled();
    });

    it('throws invalid_otp when the challenge has expired', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'challenge-1',
        expires_at: new Date(Date.now() - 1000),
        attempts: 0,
        code_hash: hashVerificationCode('123456'),
      });

      await expect(
        service.verifyChallenge('+21612345678', OtpPurpose.SIGNUP_VERIFICATION, '123456'),
      ).rejects.toThrow('invalid_otp');
    });

    it('throws invalid_otp once attempts are exhausted, without re-checking the code', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'challenge-1',
        expires_at: new Date(Date.now() + 60_000),
        attempts: 5,
        code_hash: hashVerificationCode('123456'),
      });

      await expect(
        service.verifyChallenge('+21612345678', OtpPurpose.SIGNUP_VERIFICATION, '123456'),
      ).rejects.toThrow('invalid_otp');
      expect(prisma.otpChallenge.updateMany).not.toHaveBeenCalled();
    });

    it('increments attempts and throws invalid_otp on a wrong code', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'challenge-1',
        expires_at: new Date(Date.now() + 60_000),
        attempts: 1,
        code_hash: hashVerificationCode('123456'),
      });

      await expect(
        service.verifyChallenge('+21612345678', OtpPurpose.SIGNUP_VERIFICATION, '000000'),
      ).rejects.toThrow('invalid_otp');
      expect(prisma.otpChallenge.updateMany).toHaveBeenCalledWith({
        where: { id: 'challenge-1', consumed_at: null },
        data: { attempts: { increment: 1 } },
      });
    });

    it('consumes the challenge and returns it on a correct code', async () => {
      const challenge = {
        id: 'challenge-1',
        expires_at: new Date(Date.now() + 60_000),
        attempts: 0,
        code_hash: hashVerificationCode('123456'),
      };
      prisma.otpChallenge.findFirst.mockResolvedValue(challenge);
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.verifyChallenge(
        '+21612345678',
        OtpPurpose.SIGNUP_VERIFICATION,
        '123456',
      );

      expect(result).toBe(challenge);
      expect(prisma.otpChallenge.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'challenge-1',
          consumed_at: null,
          expires_at: { gt: expect.any(Date) },
          attempts: { lt: 5 },
        },
        data: { consumed_at: expect.any(Date) },
      });
    });

    it('throws invalid_otp when the consume race is lost', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'challenge-1',
        expires_at: new Date(Date.now() + 60_000),
        attempts: 0,
        code_hash: hashVerificationCode('123456'),
      });
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.verifyChallenge('+21612345678', OtpPurpose.SIGNUP_VERIFICATION, '123456'),
      ).rejects.toThrow('invalid_otp');
    });
  });

  describe('signup grant', () => {
    it('issues a grant tied to the challenge with an expiry', async () => {
      const token = await service.issueSignupGrant('challenge-1');

      expect(token).toEqual(expect.any(String));
      expect(prisma.otpChallenge.update).toHaveBeenCalledWith({
        where: { id: 'challenge-1' },
        data: {
          grant_hash: expect.any(String),
          grant_expires_at: expect.any(Date),
        },
      });
    });

    it('consumes a valid grant exactly once', async () => {
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        service.consumeSignupGrant('+21612345678', 'some-grant-token'),
      ).resolves.toBeUndefined();
      expect(prisma.otpChallenge.updateMany).toHaveBeenCalledWith({
        where: {
          phone: '+21612345678',
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
          grant_hash: expect.any(String),
          grant_consumed_at: null,
          grant_expires_at: { gt: expect.any(Date) },
        },
        data: { grant_consumed_at: expect.any(Date) },
      });
    });

    it('rejects an already-consumed or unknown grant', async () => {
      prisma.otpChallenge.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.consumeSignupGrant('+21612345678', 'bad-token')).rejects.toThrow(
        'invalid_signup_grant',
      );
    });
  });
});
