import { PrismaClient } from '@saas-boilerplate/types';

import { config } from '../config.js';
import { normalizePhoneForAuth } from '../lib/phone.js';
import { SmsClient } from '../lib/sms.js';
import { generateNumericCode, hashVerificationCode } from '../lib/verification-code.js';
import { AbstractServiceOptions } from '../types/services.js';

const WAITLIST_OTP_TTL_MS = 5 * 60 * 1000;

function sanitizeName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

function sanitizeOccupation(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

export class WaitlistService {
  prisma: PrismaClient;
  smsClient: SmsClient;

  constructor(options: AbstractServiceOptions & { smsClient: SmsClient }) {
    this.prisma = options.prisma;
    this.smsClient = options.smsClient;
  }

  async sendOtp(input: { phone: unknown; name: unknown; occupation: unknown }) {
    const phone = normalizePhoneForAuth(input.phone);
    const name = sanitizeName(input.name);
    const occupation = sanitizeOccupation(input.occupation);

    if (!phone) {
      throw Object.assign(new Error('Numéro de téléphone invalide.'), {
        statusCode: 400,
        code: 'invalid_phone',
      });
    }
    if (name.length < 2) {
      throw Object.assign(new Error('Veuillez indiquer votre nom.'), {
        statusCode: 400,
        code: 'invalid_name',
      });
    }
    if (occupation.length < 2) {
      throw Object.assign(new Error('Veuillez indiquer votre profession.'), {
        statusCode: 400,
        code: 'invalid_occupation',
      });
    }

    const existing = await this.prisma.waitlistEntry.findUnique({ where: { phone } });
    if (existing) {
      throw Object.assign(new Error("Ce numéro est déjà inscrit sur la liste d'accès anticipé."), {
        statusCode: 409,
        code: 'ALREADY_REGISTERED',
      });
    }

    const code = generateNumericCode(6);
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + WAITLIST_OTP_TTL_MS);

    await this.prisma.waitlistPending.upsert({
      where: { phone },
      create: { phone, name, occupation, code_hash: codeHash, expires_at: expiresAt },
      update: { name, occupation, code_hash: codeHash, attempts: 0, expires_at: expiresAt },
    });

    const smsDisabled = /^(1|true|yes|on)$/i.test(String(process.env.DISABLE_SMS || ''));
    let smsOk = false;

    if (!smsDisabled) {
      try {
        await this.smsClient.sendSms(phone, `Matchy+ : votre code est ${code}. Valable 5 min.`);
        smsOk = true;
      } catch {
        smsOk = false;
      }
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!smsOk && !smsDisabled && !isDevelopment) {
      throw Object.assign(new Error("Impossible d'envoyer le SMS. Réessayez."), {
        statusCode: 502,
        code: 'sms_delivery_failed',
      });
    }

    const payload: { success: true; message: string; devCode?: string } = {
      success: true,
      message: 'Code envoyé par SMS.',
    };

    if (isDevelopment && (smsDisabled || !smsOk)) {
      payload.devCode = code;
    }

    return payload;
  }

  async verifyOtp(input: { phone: unknown; code: unknown }) {
    const phone = normalizePhoneForAuth(input.phone);
    const code = String(input.code ?? '').trim();

    if (!phone) {
      throw Object.assign(new Error('Numéro de téléphone invalide.'), {
        statusCode: 400,
        code: 'invalid_phone',
      });
    }
    if (!/^\d{4,8}$/.test(code)) {
      throw Object.assign(new Error('Code OTP invalide.'), {
        statusCode: 400,
        code: 'invalid_otp',
      });
    }

    const existing = await this.prisma.waitlistEntry.findUnique({ where: { phone } });
    if (existing) {
      throw Object.assign(new Error("Ce numéro est déjà inscrit sur la liste d'accès anticipé."), {
        statusCode: 409,
        code: 'ALREADY_REGISTERED',
      });
    }

    const pending = await this.prisma.waitlistPending.findUnique({ where: { phone } });
    if (!pending) {
      throw Object.assign(new Error('Aucun code en attente. Renvoyez un code.'), {
        statusCode: 400,
        code: 'no_pending_otp',
      });
    }

    if (pending.expires_at.getTime() < Date.now()) {
      await this.prisma.waitlistPending.delete({ where: { phone } });
      throw Object.assign(new Error('Code expiré. Renvoyez un nouveau code.'), {
        statusCode: 400,
        code: 'otp_expired',
      });
    }

    if (pending.attempts >= config.otpMaxAttempts) {
      throw Object.assign(new Error('Trop de tentatives. Renvoyez un nouveau code.'), {
        statusCode: 429,
        code: 'otp_max_attempts',
      });
    }

    const match = hashVerificationCode(code) === pending.code_hash;
    if (!match) {
      await this.prisma.waitlistPending.update({
        where: { phone },
        data: { attempts: { increment: 1 } },
      });
      throw Object.assign(new Error('Code incorrect.'), {
        statusCode: 400,
        code: 'invalid_otp',
      });
    }

    try {
      const entry = await this.prisma.waitlistEntry.create({
        data: {
          phone,
          name: pending.name,
          occupation: pending.occupation,
        },
      });

      await this.prisma.waitlistPending.delete({ where: { phone } });

      return {
        success: true as const,
        message:
          "Vous êtes inscrit sur la liste d'accès anticipé. Nous vous préviendrons au lancement.",
        entry: {
          phone: entry.phone,
          name: entry.name,
          occupation: entry.occupation,
        },
      };
    } catch {
      throw Object.assign(new Error("Ce numéro est déjà inscrit sur la liste d'accès anticipé."), {
        statusCode: 409,
        code: 'ALREADY_REGISTERED',
      });
    }
  }
}
