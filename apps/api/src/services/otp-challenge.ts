import { OtpPurpose, PrismaClient } from '@saas-boilerplate/types';

import { config } from '../config.js';
import { generateOtpGrant, hashOtpGrant } from '../lib/otp-grant.js';
import { generateNumericCode, hashVerificationCode } from '../lib/verification-code.js';
import { AbstractServiceOptions } from '../types/services.js';

/**
 * Owns the full lifecycle of purpose-scoped phone OTP challenges: hashed codes,
 * expiration, bounded attempts, resend cooldown, and — for SIGNUP_VERIFICATION only —
 * the one-time grant that proves phone ownership without itself creating a user or
 * session. Never a login mechanism itself (see doc/features/authentication.md).
 *
 * This is deliberately independent of whichever client actually delivers the SMS text
 * (see lib/twilio.ts) — callers generate the code here, then send it themselves.
 */
export class OtpChallengeService {
  prisma: PrismaClient;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  /**
   * Creates a new challenge and returns the plaintext code for the caller to deliver.
   * Throws `otp_resend_too_soon` if an unconsumed challenge for this phone+purpose was
   * created within the cooldown window, instead of silently spamming a new code.
   */
  async createChallenge(phone: string, purpose: OtpPurpose, userId?: string): Promise<string> {
    const now = new Date();
    const active = await this.prisma.otpChallenge.findFirst({
      where: { phone, purpose, consumed_at: null },
    });

    if (active) {
      const ageMs = now.getTime() - active.create_at.getTime();
      if (ageMs < config.otpResendCooldownSeconds * 1000) {
        throw new Error('otp_resend_too_soon');
      }

      // Cancel the stale challenge first — the partial unique index on
      // (phone, purpose) WHERE consumed_at IS NULL allows only one live row at a time.
      await this.prisma.otpChallenge.update({
        where: { id: active.id },
        data: { consumed_at: now },
      });
    }

    const code = generateNumericCode(6);
    await this.prisma.otpChallenge.create({
      data: {
        phone,
        purpose,
        code_hash: hashVerificationCode(code),
        expires_at: new Date(now.getTime() + config.otpTtlMinutes * 60 * 1000),
        user_id: userId ?? null,
      },
    });

    return code;
  }

  /**
   * Verifies a code against the active challenge for this phone+purpose. On success,
   * atomically marks it consumed so it can never be replayed. Every failure mode
   * (no active challenge, expired, too many attempts, wrong code) throws the same
   * `invalid_otp` externally so a caller can't distinguish them.
   *
   * `expectedUserId`, when passed (PHONE_LINK confirmation), must match the challenge's
   * stored `user_id` — otherwise any authenticated caller who obtains a valid code could
   * confirm a challenge that was requested by a different account.
   */
  async verifyChallenge(phone: string, purpose: OtpPurpose, code: string, expectedUserId?: string) {
    const now = new Date();
    const active = await this.prisma.otpChallenge.findFirst({
      where: { phone, purpose, consumed_at: null },
    });

    if (
      !active ||
      active.expires_at < now ||
      active.attempts >= config.otpMaxAttempts ||
      (expectedUserId !== undefined && active.user_id !== expectedUserId)
    ) {
      throw new Error('invalid_otp');
    }

    if (active.code_hash !== hashVerificationCode(code)) {
      await this.prisma.otpChallenge.updateMany({
        where: { id: active.id, consumed_at: null },
        data: { attempts: { increment: 1 } },
      });
      throw new Error('invalid_otp');
    }

    const consumed = await this.prisma.otpChallenge.updateMany({
      where: {
        id: active.id,
        consumed_at: null,
        expires_at: { gt: now },
        attempts: { lt: config.otpMaxAttempts },
      },
      data: { consumed_at: now },
    });

    // Lost a race against another verify/expiry — treat identically to any other failure.
    if (consumed.count !== 1) {
      throw new Error('invalid_otp');
    }

    return active;
  }

  /**
   * Issues a one-time signup grant on an already-consumed SIGNUP_VERIFICATION challenge.
   * register-phone must present this grant to actually create the account — this is what
   * lets OTP verification prove ownership without itself creating a user or a session.
   */
  async issueSignupGrant(challengeId: string): Promise<string> {
    const token = generateOtpGrant();
    await this.prisma.otpChallenge.update({
      where: { id: challengeId },
      data: {
        grant_hash: hashOtpGrant(token),
        grant_expires_at: new Date(Date.now() + config.otpSignupGrantTtlMinutes * 60 * 1000),
      },
    });

    return token;
  }

  /**
   * Consumes a signup grant, atomically, so it can only ever back one register-phone call.
   */
  async consumeSignupGrant(phone: string, token: string): Promise<void> {
    const now = new Date();
    const consumed = await this.prisma.otpChallenge.updateMany({
      where: {
        phone,
        purpose: OtpPurpose.SIGNUP_VERIFICATION,
        grant_hash: hashOtpGrant(token),
        grant_consumed_at: null,
        grant_expires_at: { gt: now },
      },
      data: { grant_consumed_at: now },
    });

    if (consumed.count !== 1) {
      throw new Error('invalid_signup_grant');
    }
  }
}
