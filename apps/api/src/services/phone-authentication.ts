import { PrismaClient } from '@saas-boilerplate/types';

import { hashPassword, verifyPassword } from '../lib/password.js';
import { normalizePhoneForAuth } from '../lib/phone.js';
import { OtpClient } from '../lib/twilio.js';
import {
  ConfirmPasswordResetPayload,
  LoginPhonePayload,
  RegisterPhonePayload,
  RequestPasswordResetPayload,
  SendOtpPayload,
  VerifyOtpPayload,
} from '../types/auth.js';
import { AbstractServiceOptions } from '../types/services.js';
import { TokenService } from './token.js';

export type PhoneAuthServiceOptions = AbstractServiceOptions & { otpClient: OtpClient };

export class PhoneAuthenticationService {
  prisma: PrismaClient;
  otpClient: OtpClient;
  tokenService: TokenService;

  constructor(options: PhoneAuthServiceOptions) {
    this.prisma = options.prisma;
    this.otpClient = options.otpClient;
    this.tokenService = new TokenService({ prisma: options.prisma });
  }

  async sendOtp(payload: SendOtpPayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    if (!phone) {
      throw new Error('invalid_phone');
    }

    await this.otpClient.sendOtp(phone);
    return { message: 'otp_sent', phone };
  }

  async verifyOtp(payload: VerifyOtpPayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    if (!phone) {
      throw new Error('invalid_phone');
    }

    const result = await this.otpClient.checkOtp(phone, payload.code);
    if (!result.valid) {
      throw new Error('invalid_otp');
    }

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({ data: { phone, auth_provider: 'phone' } });
    }

    const tokens = await this.tokenService.issueTokenPair(user);
    return { ...tokens, user };
  }

  async loginWithPhone(payload: LoginPhonePayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    const user = phone ? await this.prisma.user.findUnique({ where: { phone } }) : null;

    if (!user || !user.password) {
      throw new Error('invalid_credentials');
    }

    const isValid = await verifyPassword(payload.password, user.password);
    if (!isValid) {
      throw new Error('invalid_credentials');
    }

    const tokens = await this.tokenService.issueTokenPair(user);
    return { ...tokens, user };
  }

  async registerWithPhone(payload: RegisterPhonePayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    if (!phone) {
      throw new Error('invalid_phone');
    }

    const result = await this.otpClient.checkOtp(phone, payload.code);
    if (!result.valid) {
      throw new Error('invalid_otp');
    }

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new Error('phone_already_registered');
    }

    const hashedPassword = await hashPassword(payload.password);
    const user = await this.prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        name: payload.name ?? null,
        auth_provider: 'phone',
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
        await this.otpClient.sendOtp(phone);
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

    const result = await this.otpClient.checkOtp(phone, payload.code);
    if (!result.valid) {
      throw new Error('invalid_otp');
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new Error('phone_not_found');
    }

    const hashedPassword = await hashPassword(payload.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, auth_provider: 'phone' },
    });

    return { message: 'password_reset' };
  }
}
