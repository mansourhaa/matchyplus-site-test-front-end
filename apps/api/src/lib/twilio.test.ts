import { afterEach, describe, expect, it, vi } from 'vitest';

describe('createOtpClient', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('fails closed with otp_service_not_configured when Twilio credentials are unset', async () => {
    vi.resetModules();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    const { createOtpClient } = await import('./twilio.js');
    const client = createOtpClient();

    await expect(client.sendOtp('+21612345678')).rejects.toThrow('otp_service_not_configured');
    await expect(client.checkOtp('+21612345678', '123456')).rejects.toThrow(
      'otp_service_not_configured',
    );
  });

  it('fails closed when only some Twilio credentials are set', async () => {
    vi.resetModules();
    process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    const { createOtpClient } = await import('./twilio.js');
    const client = createOtpClient();

    await expect(client.sendOtp('+21612345678')).rejects.toThrow('otp_service_not_configured');
  });
});
