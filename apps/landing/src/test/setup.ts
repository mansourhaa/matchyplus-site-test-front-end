import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// vitest.config.ts doesn't set test.globals, so @testing-library/react's automatic
// afterEach(cleanup) never registers. Without this, DOM from earlier tests in the
// same file stays mounted and gets matched by later queries.
afterEach(() => {
  cleanup();
});

// jsdom has no IntersectionObserver; framer-motion's whileInView and useInView need one.
// This stand-in never reports an intersection, so components render in their resting state.
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  class IntersectionObserverStub {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', { value: IntersectionObserverStub });
}
