import { config } from '../config.js';

export interface OtpClient {
  sendOtp(phone: string): Promise<{ status: string; sid: string }>;
  checkOtp(phone: string, code: string): Promise<{ status: string; valid: boolean }>;
}

function createRealOtpClient(): OtpClient {
  let client: any = null;

  async function getClient() {
    if (!client) {
      const { default: twilio } = await import('twilio');
      client = twilio(config.twilioAccountSid, config.twilioAuthToken);
    }

    return client;
  }

  const serviceSid = config.twilioVerifyServiceSid;

  return {
    async sendOtp(phone) {
      const client = await getClient();

      const verification = await client.verify.v2.services(serviceSid).verifications.create({
        to: phone,
        channel: 'sms',
      });

      return {
        status: verification.status,
        sid: verification.sid,
      };
    },

    async checkOtp(phone, code) {
      const client = await getClient();

      const check = await client.verify.v2.services(serviceSid).verificationChecks.create({
        to: phone,
        code,
      });

      return {
        status: check.status,
        valid: check.status === 'approved',
      };
    },
  };
}

// Called once at plugin registration time (see plugins/twilio.ts) — the check must be
// eager so a missing config always yields the stub client, never a half-configured
// real one. checkOtp on the stub always fails closed (never returns valid: true), so
// this never weakens OTP verification, it just fails clearly when Twilio isn't set up.
function isTwilioConfigured(): boolean {
  return Boolean(
    config.twilioAccountSid && config.twilioAuthToken && config.twilioVerifyServiceSid,
  );
}

function createUnconfiguredOtpClient(): OtpClient {
  return {
    async sendOtp() {
      throw new Error('otp_service_not_configured');
    },
    async checkOtp() {
      throw new Error('otp_service_not_configured');
    },
  };
}

export function createOtpClient(): OtpClient {
  if (!isTwilioConfigured()) {
    return createUnconfiguredOtpClient();
  }

  return createRealOtpClient();
}
