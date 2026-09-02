import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
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
              suiteName: 'app',
              // Without this every app's classname is just the file path, and
              // api/app/admin all have a src/lib/... - Jenkins keys test history
              // on classname + name, so same-named files in two apps would merge
              // into one test with a nonsense pass/fail history.
              classnameTemplate: 'app.{filename}',
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
    coverage: {
      provider: 'v8',
      reporter: ['lcovonly', 'text'],
      reportsDirectory: 'coverage',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
