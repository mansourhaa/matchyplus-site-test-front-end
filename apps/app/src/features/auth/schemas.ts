import { z } from 'zod';

const phonePasswordSchema = z.string().min(6);
const phoneNumberSchema = z.string().min(6);

export const sendOtpSchema = z.object({
  phone: phoneNumberSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneNumberSchema,
  code: z.string().min(4).max(10),
});

export const loginPhoneSchema = z.object({
  phone: phoneNumberSchema,
  password: phonePasswordSchema,
});

export const registerPhoneSchema = z.object({
  phone: phoneNumberSchema,
  password: phonePasswordSchema,
  signupToken: z.string().min(16),
  name: z.string().optional(),
});

export type SendOtpSchema = z.infer<typeof sendOtpSchema>;
export type VerifyOtpSchema = z.infer<typeof verifyOtpSchema>;
export type LoginPhoneSchema = z.infer<typeof loginPhoneSchema>;
export type RegisterPhoneSchema = z.infer<typeof registerPhoneSchema>;
