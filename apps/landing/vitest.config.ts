import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // Logic tests run in node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` comment at the top of the file.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
    // Pins the public domain so canonical / hreflang / sitemap assertions match production.
    env: { LANDING_URL: 'https://matchyplus.com' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
