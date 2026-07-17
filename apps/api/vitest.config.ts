import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/routes/**'],
    testTimeout: 10000,
    server: {
      deps: {
        inline: ['@fastify/autoload'],
      },
    },
    env: {
      NODE_ENV: 'test',
      SERVER_PORT: '8000',
      SERVER_HOST: 'localhost',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test?schema=public',
      ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      ACCESS_TOKEN_TTL: '3600',
      COOKIE_SECRET: 'test-cookie-secret',
      TWILIO_ACCOUNT_SID: 'test-twilio-account-sid',
      TWILIO_AUTH_TOKEN: 'test-twilio-auth-token',
      TWILIO_VERIFY_SERVICE_SID: 'test-twilio-verify-service-sid',
      REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
      REFRESH_TOKEN_TTL_DAYS: '120',
    },
  },
});
