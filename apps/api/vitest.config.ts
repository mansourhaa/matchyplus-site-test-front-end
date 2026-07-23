import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/routes/**'],
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
      // NODE_ENV is 'test' here, so the cors plugin requires an explicit allowlist just like
      // it does in staging and production; tests run against the deployed shape, not the
      // permissive development one.
      CORS_ORIGINS: 'http://localhost:3000',
    },
  },
});
