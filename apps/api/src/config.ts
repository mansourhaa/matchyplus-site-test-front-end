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
};
