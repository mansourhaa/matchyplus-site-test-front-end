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
});
