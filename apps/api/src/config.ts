import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Throws an error if the environment variable is missing.
 */
function requiredVar(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * Same as requiredVar, but parses the variable as an integer.
 */
function requiredIntVar(name: string): number {
  const raw = requiredVar(name);
  const parsed = parseInt(raw, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer environment variable: ${name} = "${raw}"`);
  }

  return parsed;
}

export const config = {
  /**
   * Application settings
   */
  nodeEnv: process.env.NODE_ENV,
  serverPort: requiredIntVar('SERVER_PORT'),
  serverHost: requiredVar('SERVER_HOST'),

  /**
   * Database
   */
  databaseUrl: requiredVar('DATABASE_URL'),

  /**
   * Authentication
   */
  accessTokenSecret: requiredVar('ACCESS_TOKEN_SECRET'),
  accessTokenTtl: requiredVar('ACCESS_TOKEN_TTL'),
  verificationCodeSecret: requiredVar('VERIFICATION_CODE_SECRET'),
  /**
   * Option C — async AI queue / cache
   */
  redisUrl: process.env.REDIS_URL ?? '',
  aiStreamKey: process.env.AI_STREAM_KEY ?? 'ai:jobs',
  aiConsumerGroup: process.env.AI_CONSUMER_GROUP ?? 'ai-workers',
  aiCacheTtlSeconds: parseInt(process.env.AI_CACHE_TTL_SECONDS ?? '300', 10),

  /**
   * SMS delivery (TunisieSMS) — optional at startup. The API boots without this; an
   * OTP-dependent endpoint fails at request time with `sms_service_not_configured`
   * instead (see lib/sms.ts). TunisieSMS only sends text messages — it never manages
   * OTP codes itself, unlike Twilio Verify — so this app owns the whole OTP lifecycle
   * (see services/otp-challenge.ts).
   */
  tunisieSmsKey: process.env.TUNISIESMS_KEY,
  tunisieSmsSender: process.env.TUNISIESMS_SENDER,

  /**
   * OTP challenge lifecycle (see services/otp-challenge.ts) — purpose-scoped codes
   * this app owns and verifies itself, independent of whichever SMS provider sends them.
   */
  otpTtlMinutes: parseInt(process.env.OTP_TTL_MINUTES ?? '10', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
  otpResendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? '60', 10),
  otpSignupGrantTtlMinutes: parseInt(process.env.OTP_SIGNUP_GRANT_TTL_MINUTES ?? '15', 10),

  /**
   * Refresh tokens
   */
  refreshTokenSecret: requiredVar('REFRESH_TOKEN_SECRET'),
  refreshTokenTtlDays: requiredIntVar('REFRESH_TOKEN_TTL_DAYS'),

  /**
   * Capacitor mobile client shared secret. Optional at boot — when unset, body JWT
   * issuance and body refresh are disabled (cookie-only auth remains). Cap builds
   * inject the same value via the native MobileClient plugin (not NEXT_PUBLIC_*).
   */
  mobileClientSecret: process.env.MOBILE_CLIENT_SECRET?.trim() || '',

  /**
   * OAuth (Google / LinkedIn) — optional. Each provider is only enabled when both its
   * client id and secret are set; a missing pair disables just that provider instead
   * of preventing the server from starting.
   */
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  linkedinClientId: process.env.LINKEDIN_CLIENT_ID,
  linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:8000',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  oauthExchangeCodeTtlSeconds: parseInt(process.env.OAUTH_EXCHANGE_CODE_TTL_SECONDS ?? '60', 10),
};
