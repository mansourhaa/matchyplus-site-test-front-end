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
