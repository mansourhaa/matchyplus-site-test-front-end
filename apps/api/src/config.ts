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
   * Phone OTP (Twilio Verify)
   */
  twilioAccountSid: requiredVar('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: requiredVar('TWILIO_AUTH_TOKEN'),
  twilioVerifyServiceSid: requiredVar('TWILIO_VERIFY_SERVICE_SID'),

  /**
   * Refresh tokens
   */
  refreshTokenSecret: requiredVar('REFRESH_TOKEN_SECRET'),
  refreshTokenTtlDays: requiredIntVar('REFRESH_TOKEN_TTL_DAYS'),

  /**
   * Email (SMTP) — optional. Email verification fails at request time (not at server
   * boot) if these aren't set.
   */
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,
  smtpFromName: process.env.SMTP_FROM_NAME,
  smtpSecure: process.env.SMTP_SECURE,
  appName: process.env.APP_NAME,

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
