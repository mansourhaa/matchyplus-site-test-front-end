import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/routes/**'],
    testTimeout: 15000,
    // Jenkins publishes these with the junit step, which is what gives it
    // per-test history across builds and lets it label an intermittent failure
    // a flake on its own. Gated on CI so a local `pnpm test` keeps its normal
    // console output and does not drop an XML file in the working tree.
    //
    // The path sits under test-results/, which is listed in turbo.json's
    // outputs for the test task - without that, a turbo cache hit would restore
    // coverage but not the XML, and Jenkins would publish the previous run's
    // results as if they were this one's.
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            {
              suiteName: 'api',
              // Without this every app's classname is just the file path, and
              // api/app/admin all have a src/lib/... - Jenkins keys test history
              // on classname + name, so same-named files in two apps would merge
              // into one test with a nonsense pass/fail history.
              classnameTemplate: 'api.{filename}',
            },
          ],
        ]
      : ['default'],
    outputFile: { junit: './test-results/junit.xml' },
    // Jenkins runs api/app/admin's test suites in parallel via turbo on a
    // 4-core host; each suite's own worker pool defaults to sizing itself
    // to the CPU count, so 3 suites x 4 threads massively oversubscribes
    // 4 real cores and causes spurious timeouts/503s under load. Capping
    // keeps each suite's footprint predictable when they run concurrently.
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 2,
      },
    },
    server: {
      deps: {
        inline: ['@fastify/autoload'],
      },
    },
    env: {
      NODE_ENV: 'test',
      DOTENV_CONFIG_QUIET: 'true',
      SERVER_PORT: '8000',
      SERVER_HOST: 'localhost',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test?schema=public',
      ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      ACCESS_TOKEN_TTL: '1h',
      VERIFICATION_CODE_SECRET: 'test-verification-code-secret',
      COOKIE_SECRET: 'test-cookie-secret',
      TWILIO_ACCOUNT_SID: 'test-twilio-account-sid',
      TWILIO_AUTH_TOKEN: 'test-twilio-auth-token',
      TWILIO_VERIFY_SERVICE_SID: 'test-twilio-verify-service-sid',
      REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
      REFRESH_TOKEN_TTL_DAYS: '120',
      ADMIN_REFRESH_TOKEN_TTL: '12h',
      MOBILE_CLIENT_SECRET: 'test-mobile-client-secret',

      // NODE_ENV is 'test' here, so the CORS plugin requires an explicit allowlist.
      CORS_ORIGINS: 'http://localhost:3000',
    },
    coverage: {
      provider: 'v8',
      reporter: ['lcovonly', 'text'],
      reportsDirectory: 'coverage',
    },
  },
});
