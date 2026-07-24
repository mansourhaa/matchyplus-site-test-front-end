import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// vitest.config.ts doesn't set test.globals, so @testing-library/react's automatic
// afterEach(cleanup) never registers — without this, DOM from earlier tests in the same
// file stays mounted and gets matched by later queries.
afterEach(() => {
  cleanup();
});
