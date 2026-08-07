import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hashVerificationCode } from '../lib/verification-code.js';
import { WaitlistService } from './waitlist.js';

function createMockPrisma() {
  return {
    waitlistEntry: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    waitlistPending: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  };
}

function createService(prisma = createMockPrisma()) {
  const smsClient = { sendSms: vi.fn().mockResolvedValue(undefined) };
  const service = new WaitlistService({
    prisma: prisma as never,
    smsClient: smsClient as never,
  });
  return { service, prisma, smsClient };
}

const validInput = {
  phone: '+21612345678',
  name: 'Jane Doe',
  occupation: 'Engineer',
};

describe('WaitlistService.sendOtp', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDisableSms = process.env.DISABLE_SMS;

  beforeEach(() => {
    delete process.env.DISABLE_SMS;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalDisableSms === undefined) {
      delete process.env.DISABLE_SMS;
    } else {
      process.env.DISABLE_SMS = originalDisableSms;
    }
  });

  it('does not return devCode when NODE_ENV is staging and SMS succeeds', async () => {
    process.env.NODE_ENV = 'staging';
    const { service, prisma } = createService();
    prisma.waitlistEntry.findUnique.mockResolvedValue(null);
    prisma.waitlistPending.upsert.mockResolvedValue({});

    const result = await service.sendOtp(validInput);

    expect(result.devCode).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it('returns devCode in development when DISABLE_SMS is set', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DISABLE_SMS = 'true';
    const { service, prisma, smsClient } = createService();
    prisma.waitlistEntry.findUnique.mockResolvedValue(null);
    prisma.waitlistPending.upsert.mockResolvedValue({});

    const result = await service.sendOtp(validInput);

    expect(result.devCode).toMatch(/^\d{6}$/);
    expect(smsClient.sendSms).not.toHaveBeenCalled();
  });

  it('throws sms_delivery_failed on staging when SMS delivery fails', async () => {
    process.env.NODE_ENV = 'staging';
    const { service, prisma, smsClient } = createService();
    prisma.waitlistEntry.findUnique.mockResolvedValue(null);
    prisma.waitlistPending.upsert.mockResolvedValue({});
    smsClient.sendSms.mockRejectedValue(new Error('sms_delivery_failed'));

    await expect(service.sendOtp(validInput)).rejects.toMatchObject({
      statusCode: 502,
      code: 'sms_delivery_failed',
    });
  });
});

describe('WaitlistService.verifyOtp', () => {
  it('commits a waitlist entry when the OTP matches', async () => {
    const { service, prisma } = createService();
    prisma.waitlistEntry.findUnique.mockResolvedValue(null);
    prisma.waitlistPending.findUnique.mockResolvedValue({
      name: 'Jane Doe',
      occupation: 'Engineer',
      code_hash: hashVerificationCode('123456'),
      expires_at: new Date(Date.now() + 60_000),
      attempts: 0,
    });
    prisma.waitlistEntry.create.mockResolvedValue({
      phone: '+21612345678',
      name: 'Jane Doe',
      occupation: 'Engineer',
    });
    prisma.waitlistPending.delete.mockResolvedValue({});

    const result = await service.verifyOtp({ phone: '+21612345678', code: '123456' });

    expect(result.success).toBe(true);
    expect(result.entry).toEqual({
      phone: '+21612345678',
      name: 'Jane Doe',
      occupation: 'Engineer',
    });
  });

  it('rejects expired OTP codes', async () => {
    const { service, prisma } = createService();
    prisma.waitlistEntry.findUnique.mockResolvedValue(null);
    prisma.waitlistPending.findUnique.mockResolvedValue({
      name: 'Jane Doe',
      occupation: 'Engineer',
      code_hash: hashVerificationCode('123456'),
      expires_at: new Date(Date.now() - 1_000),
      attempts: 0,
    });
    prisma.waitlistPending.delete.mockResolvedValue({});

    await expect(
      service.verifyOtp({ phone: '+21612345678', code: '123456' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'otp_expired' });
  });
});
