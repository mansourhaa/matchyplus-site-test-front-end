import { describe, expect, it, vi } from 'vitest';

import { PhoneAuthenticationService } from './phone-authentication.js';
import { TokenService } from './token.js';

function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
    },
  };
}

function createPhoneLinkService(
  prisma = createMockPrisma(),
  otpOverrides: Record<string, unknown> = {},
) {
  const otpClient = {
    sendOtp: vi.fn().mockResolvedValue({ status: 'pending', sid: 'test-sid' }),
    checkOtp: vi.fn().mockResolvedValue({ valid: true, status: 'approved' }),
    ...otpOverrides,
  };
  const service = new PhoneAuthenticationService({
    prisma: prisma as never,
    otpClient: otpClient as never,
  });
  return { service, prisma, otpClient };
}

describe('PhoneAuthenticationService', () => {
  it('sends an OTP after normalizing the phone number', async () => {
    const prisma = createMockPrisma();
    const otpClient = {
      sendOtp: vi.fn().mockResolvedValue({ status: 'pending', sid: 'test-sid' }),
      checkOtp: vi.fn(),
    };

    const service = new PhoneAuthenticationService({
      prisma: prisma as never,
      otpClient: otpClient as never,
    });

    const result = await service.sendOtp({ phone: '+33 6 12 34 56 78' });

    expect(otpClient.sendOtp).toHaveBeenCalledWith('+33612345678');
    expect(result).toEqual({ message: 'otp_sent', phone: '+33612345678' });
  });

  it('requires a valid OTP before creating a phone account', async () => {
    const prisma = createMockPrisma();
    const otpClient = {
      sendOtp: vi.fn(),
      checkOtp: vi.fn().mockResolvedValue({ valid: false, status: 'pending' }),
    };

    const service = new PhoneAuthenticationService({
      prisma: prisma as never,
      otpClient: otpClient as never,
    });

    await expect(
      service.registerWithPhone({
        phone: '+33 6 12 34 56 78',
        password: 'password123',
        code: '123456',
      }),
    ).rejects.toThrow('invalid_otp');

    expect(otpClient.checkOtp).toHaveBeenCalledWith('+33612345678', '123456');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('returns a uniform success response for an unknown phone without sending OTP', async () => {
    const prisma = createMockPrisma();
    const otpClient = {
      sendOtp: vi.fn(),
      checkOtp: vi.fn(),
    };

    prisma.user.findUnique.mockResolvedValue(null);

    const service = new PhoneAuthenticationService({
      prisma: prisma as never,
      otpClient: otpClient as never,
    });

    const result = await service.requestPasswordReset({ phone: '+33 6 12 34 56 78' });

    expect(result).toEqual({ message: 'reset_code_sent' });
    expect(otpClient.sendOtp).not.toHaveBeenCalled();
  });

  it('returns a uniform success response for a passwordless user without sending OTP', async () => {
    const prisma = createMockPrisma();
    const otpClient = {
      sendOtp: vi.fn(),
      checkOtp: vi.fn(),
    };

    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', phone: '+33612345678' });

    const service = new PhoneAuthenticationService({
      prisma: prisma as never,
      otpClient: otpClient as never,
    });

    const result = await service.requestPasswordReset({ phone: '+33 6 12 34 56 78' });

    expect(result).toEqual({ message: 'reset_code_sent' });
    expect(otpClient.sendOtp).not.toHaveBeenCalled();
  });

  it('returns a uniform success response and sends OTP for a valid passworded user', async () => {
    const prisma = createMockPrisma();
    const otpClient = {
      sendOtp: vi.fn().mockResolvedValue({ status: 'pending', sid: 'test-sid' }),
      checkOtp: vi.fn(),
    };

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      phone: '+33612345678',
      password: 'hashed-password',
    });

    const service = new PhoneAuthenticationService({
      prisma: prisma as never,
      otpClient: otpClient as never,
    });

    const result = await service.requestPasswordReset({ phone: '+33 6 12 34 56 78' });

    expect(result).toEqual({ message: 'reset_code_sent' });
    expect(otpClient.sendOtp).toHaveBeenCalledWith('+33612345678');
  });

  it('returns a uniform success response when OTP delivery fails', async () => {
    const prisma = createMockPrisma();
    const otpClient = {
      sendOtp: vi.fn().mockRejectedValue(new Error('twilio-down')),
      checkOtp: vi.fn(),
    };

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      phone: '+33612345678',
      password: 'hashed-password',
    });

    const service = new PhoneAuthenticationService({
      prisma: prisma as never,
      otpClient: otpClient as never,
    });

    const result = await service.requestPasswordReset({ phone: '+33 6 12 34 56 78' });

    expect(result).toEqual({ message: 'reset_code_sent' });
    expect(otpClient.sendOtp).toHaveBeenCalledWith('+33612345678');
  });

  it('verifies OTP and creates a user when none exists yet', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      phone: '+33612345678',
      auth_provider: 'phone',
    });

    const otpClient = {
      sendOtp: vi.fn(),
      checkOtp: vi.fn().mockResolvedValue({ valid: true, status: 'approved' }),
    };

    const issueTokenPairSpy = vi
      .spyOn(TokenService.prototype, 'issueTokenPair')
      .mockResolvedValue({ accessToken: 'access-token', refreshToken: 'refresh-token' });

    const service = new PhoneAuthenticationService({
      prisma: prisma as never,
      otpClient: otpClient as never,
    });

    const result = await service.verifyOtp({ phone: '06 12 34 56 78', code: '123456' });

    expect(otpClient.checkOtp).toHaveBeenCalledWith('+0612345678', '123456');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { phone: '+0612345678', auth_provider: 'phone' },
    });
    expect(result.accessToken).toBe('access-token');
    expect(result.user.phone).toBe('+33612345678');

    issueTokenPairSpy.mockRestore();
  });

  describe('requestPhoneLink', () => {
    it('rejects when the account was not created via a social provider', async () => {
      const { service, prisma, otpClient } = createPhoneLinkService();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        auth_provider: 'email',
        phone: null,
      });

      await expect(
        service.requestPhoneLink({ userId: 'user-1', phone: '+33612345678' }),
      ).rejects.toThrow('phone_link_not_allowed');
      expect(otpClient.sendOtp).not.toHaveBeenCalled();
    });

    it('rejects when the account already has a linked phone', async () => {
      const { service, prisma, otpClient } = createPhoneLinkService();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        auth_provider: 'google',
        phone: '+33600000000',
      });

      await expect(
        service.requestPhoneLink({ userId: 'user-1', phone: '+33612345678' }),
      ).rejects.toThrow('phone_already_linked');
      expect(otpClient.sendOtp).not.toHaveBeenCalled();
    });

    it('rejects when the phone number is already registered to someone else', async () => {
      const { service, prisma, otpClient } = createPhoneLinkService();
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', auth_provider: 'google', phone: null })
        .mockResolvedValueOnce({ id: 'other-user', phone: '+33612345678' });

      await expect(
        service.requestPhoneLink({ userId: 'user-1', phone: '+33612345678' }),
      ).rejects.toThrow('phone_already_registered');
      expect(otpClient.sendOtp).not.toHaveBeenCalled();
    });

    it('sends an OTP for an eligible social account', async () => {
      const { service, prisma, otpClient } = createPhoneLinkService();
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', auth_provider: 'linkedin', phone: null })
        .mockResolvedValueOnce(null);

      const result = await service.requestPhoneLink({ userId: 'user-1', phone: '+33612345678' });

      expect(otpClient.sendOtp).toHaveBeenCalledWith('+33612345678');
      expect(result).toEqual({ message: 'phone_link_code_sent', phone: '+33612345678' });
    });
  });

  describe('confirmPhoneLink', () => {
    it('re-checks eligibility instead of trusting the request-time check', async () => {
      const { service, prisma, otpClient } = createPhoneLinkService();
      // The account is no longer eligible by confirm time (e.g. it already linked a
      // phone through a concurrent request) — confirm must catch this itself.
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        auth_provider: 'google',
        phone: '+33699999999',
      });

      await expect(
        service.confirmPhoneLink({ userId: 'user-1', phone: '+33612345678', code: '123456' }),
      ).rejects.toThrow('phone_already_linked');
      expect(otpClient.checkOtp).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a non-social account even if it somehow reaches confirm', async () => {
      const { service, prisma, otpClient } = createPhoneLinkService();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        auth_provider: 'email',
        phone: null,
      });

      await expect(
        service.confirmPhoneLink({ userId: 'user-1', phone: '+33612345678', code: '123456' }),
      ).rejects.toThrow('phone_link_not_allowed');
      expect(otpClient.checkOtp).not.toHaveBeenCalled();
    });

    it('rejects an invalid OTP without linking the phone', async () => {
      const { service, prisma } = createPhoneLinkService(createMockPrisma(), {
        checkOtp: vi.fn().mockResolvedValue({ valid: false, status: 'pending' }),
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        auth_provider: 'google',
        phone: null,
      });

      await expect(
        service.confirmPhoneLink({ userId: 'user-1', phone: '+33612345678', code: '000000' }),
      ).rejects.toThrow('invalid_otp');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects when the phone was claimed by someone else between request and confirm', async () => {
      const { service, prisma } = createPhoneLinkService();
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', auth_provider: 'google', phone: null })
        .mockResolvedValueOnce({ id: 'other-user', phone: '+33612345678' });

      await expect(
        service.confirmPhoneLink({ userId: 'user-1', phone: '+33612345678', code: '123456' }),
      ).rejects.toThrow('phone_already_registered');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('links the phone once every check passes', async () => {
      const { service, prisma, otpClient } = createPhoneLinkService();
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', auth_provider: 'google', phone: null })
        .mockResolvedValueOnce(null);
      prisma.user.update.mockResolvedValue({ id: 'user-1', phone: '+33612345678' });

      const result = await service.confirmPhoneLink({
        userId: 'user-1',
        phone: '+33612345678',
        code: '123456',
      });

      expect(otpClient.checkOtp).toHaveBeenCalledWith('+33612345678', '123456');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { phone: '+33612345678' },
      });
      expect(result).toEqual({ message: 'phone_linked', phone: '+33612345678' });
    });
  });
});
