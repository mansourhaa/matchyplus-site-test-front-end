import { OtpPurpose, PrismaClient } from '@saas-boilerplate/types';

import { SOCIAL_AUTH_PROVIDERS } from '../constants.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { normalizePhoneForAuth } from '../lib/phone.js';
import { SmsClient } from '../lib/sms.js';
import {
  ConfirmPasswordResetPayload,
  ConfirmPhoneLinkPayload,
  LoginPhonePayload,
  RegisterPhonePayload,
  RequestPasswordResetPayload,
  RequestPhoneLinkPayload,
  SendOtpPayload,
  VerifyOtpPayload,
} from '../types/auth.js';
import { AbstractServiceOptions } from '../types/services.js';
import { OtpChallengeService } from './otp-challenge.js';
import { TokenService } from './token.js';

export type PhoneAuthServiceOptions = AbstractServiceOptions & { smsClient: SmsClient };

function otpMessage(code: string): string {
  return `Matchy+: your verification code is ${code}.`;
}

export class PhoneAuthenticationService {
  prisma: PrismaClient;
  smsClient: SmsClient;
  tokenService: TokenService;
  otpChallengeService: OtpChallengeService;

  constructor(options: PhoneAuthServiceOptions) {
    this.prisma = options.prisma;
    this.smsClient = options.smsClient;
    this.tokenService = new TokenService({ prisma: options.prisma });
    this.otpChallengeService = new OtpChallengeService({ prisma: options.prisma });
  }

  async sendOtp(payload: SendOtpPayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    if (!phone) {
      throw new Error('invalid_phone');
    }

    const code = await this.otpChallengeService.createChallenge(
      phone,
      OtpPurpose.SIGNUP_VERIFICATION,
    );
    await this.smsClient.sendSms(phone, otpMessage(code));

    return { message: 'otp_sent', phone };
  }

  /**
   * Proves ownership of the phone for signup only — never creates a user or session
   * itself (see doc/reviews/authentication-contract.md). register-phone consumes the
   * returned grant to actually create the account.
   */
  async verifyOtp(payload: VerifyOtpPayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    if (!phone) {
      throw new Error('invalid_phone');
    }

    const challenge = await this.otpChallengeService.verifyChallenge(
      phone,
      OtpPurpose.SIGNUP_VERIFICATION,
      payload.code,
    );
    const signupToken = await this.otpChallengeService.issueSignupGrant(challenge.id);

    return { verified: true as const, phone, signupToken };
  }

  async loginWithPhone(payload: LoginPhonePayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    const user = phone ? await this.prisma.user.findUnique({ where: { phone } }) : null;

    if (!user) {
      throw new Error('invalid_credentials');
    }

    // A social-only account never had a password to check — this is not a wrong
    // password, so it gets its own actionable code rather than the generic one.
    if (!user.password) {
      throw new Error('oauth_only_account');
    }

    const isValid = await verifyPassword(payload.password, user.password);
    if (!isValid) {
      throw new Error('invalid_credentials');
    }

    // Only reached once the password is already confirmed correct, so this can't be
    // used to probe whether a phone number has an account at all.
    if (!user.phone_verified) {
      throw new Error('phone_not_verified');
    }

    const tokens = await this.tokenService.issueTokenPair(user);
    return { ...tokens, user };
  }

  async registerWithPhone(payload: RegisterPhonePayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    if (!phone) {
      throw new Error('invalid_phone');
    }

    await this.otpChallengeService.consumeSignupGrant(phone, payload.signupToken);

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new Error('phone_already_registered');
    }

    const hashedPassword = await hashPassword(payload.password);
    const user = await this.prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        name: payload.name ?? phone,
        auth_provider: 'phone',
        phone_verified: true,
      },
    });

    const tokens = await this.tokenService.issueTokenPair(user);
    return { ...tokens, user };
  }

  async requestPasswordReset(payload: RequestPasswordResetPayload) {
    const phone = normalizePhoneForAuth(payload.phone);

    if (!phone) {
      throw new Error('invalid_phone');
    }

    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (user?.password) {
      try {
        const code = await this.otpChallengeService.createChallenge(
          phone,
          OtpPurpose.PASSWORD_RESET,
          user.id,
        );
        await this.smsClient.sendSms(phone, otpMessage(code));
      } catch {}
    }

    return {
      message: 'reset_code_sent',
    };
  }

  async confirmPasswordReset(payload: ConfirmPasswordResetPayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    if (!phone) {
      throw new Error('invalid_phone');
    }

    await this.otpChallengeService.verifyChallenge(phone, OtpPurpose.PASSWORD_RESET, payload.code);

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new Error('phone_not_found');
    }

    const hashedPassword = await hashPassword(payload.newPassword);
    // Deliberately does not touch auth_provider — a reset never changes how the account
    // is otherwise authenticated, only its password.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // A reset is a credential change just like changePassword — every existing session
    // must die so a token stolen before the reset can't outlive it.
    await this.tokenService.revokeAllRefreshTokens(user.id);

    return { message: 'password_reset' };
  }

  async requestPhoneLink(payload: RequestPhoneLinkPayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    if (!phone) {
      throw new Error('invalid_phone');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new Error('user_not_found');
    }
    if (!SOCIAL_AUTH_PROVIDERS.has(user.auth_provider)) {
      throw new Error('phone_link_not_allowed');
    }
    if (user.phone) {
      throw new Error('phone_already_linked');
    }

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new Error('phone_already_registered');
    }

    const code = await this.otpChallengeService.createChallenge(
      phone,
      OtpPurpose.PHONE_LINK,
      user.id,
    );
    await this.smsClient.sendSms(phone, otpMessage(code));

    return { message: 'phone_link_code_sent', phone };
  }

  async confirmPhoneLink(payload: ConfirmPhoneLinkPayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    if (!phone) {
      throw new Error('invalid_phone');
    }

    // Re-check eligibility at confirm time, not just at request time — the account's
    // provider/phone state can change in between (e.g. a concurrent link completing),
    // so trusting the request-time check alone would let a stale request overwrite it.
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new Error('user_not_found');
    }
    if (!SOCIAL_AUTH_PROVIDERS.has(user.auth_provider)) {
      throw new Error('phone_link_not_allowed');
    }
    if (user.phone) {
      throw new Error('phone_already_linked');
    }

    await this.otpChallengeService.verifyChallenge(phone, OtpPurpose.PHONE_LINK, payload.code);

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new Error('phone_already_registered');
    }

    // A completed OTP check is real proof of ownership, same as signup — mark it verified
    // so this account becomes eligible for phone+password login going forward.
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { phone, phone_verified: true },
    });

    return { message: 'phone_linked', phone: updated.phone as string };
  }
}
