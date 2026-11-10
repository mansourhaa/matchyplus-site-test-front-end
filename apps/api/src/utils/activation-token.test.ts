import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ACTIVATION_TOKEN_TTL_MS,
  buildActivationLink,
  computeActivationExpiry,
  generateActivationToken,
  getFrontendBaseUrl,
  hashActivationToken,
} from './activation-token.js';

describe('activation-token utilities', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.APP_URL;
    delete process.env.FRONTEND_URL;
    delete process.env.PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('generateActivationToken', () => {
    it('produces a 64-character hex string with sufficient entropy', () => {
      const token1 = generateActivationToken();
      const token2 = generateActivationToken();
      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('hashActivationToken', () => {
    it('computes sha256 hash deterministically and trims whitespace', () => {
      const hash1 = hashActivationToken('my-token');
      const hash2 = hashActivationToken('  my-token  ');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('computeActivationExpiry', () => {
    it('defaults to 14 days in the future', () => {
      const before = Date.now();
      const expiry = computeActivationExpiry();
      const after = Date.now();

      expect(expiry.getTime()).toBeGreaterThanOrEqual(before + ACTIVATION_TOKEN_TTL_MS);
      expect(expiry.getTime()).toBeLessThanOrEqual(after + ACTIVATION_TOKEN_TTL_MS);
    });

    it('accepts custom ttlMs', () => {
      const before = Date.now();
      const expiry = computeActivationExpiry(60_000);
      expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 60_000);
      expect(expiry.getTime()).toBeLessThanOrEqual(Date.now() + 60_000);
    });
  });

  describe('getFrontendBaseUrl & buildActivationLink', () => {
    it('falls back to http://localhost:3000 when no env candidate is set', () => {
      expect(getFrontendBaseUrl()).toBe('http://localhost:3000');
      expect(buildActivationLink('tok123')).toBe('http://localhost:3000/activer?token=tok123');
    });

    it('resolves APP_URL as top priority and strips trailing slashes', () => {
      process.env.APP_URL = 'https://app.matchyplus.com/';
      process.env.FRONTEND_URL = 'https://other.matchyplus.com';
      expect(getFrontendBaseUrl()).toBe('https://app.matchyplus.com');
      expect(buildActivationLink('tok123')).toBe(
        'https://app.matchyplus.com/activer?token=tok123',
      );
    });

    it('falls back to FRONTEND_URL when APP_URL is unset', () => {
      process.env.FRONTEND_URL = 'https://app.staging.matchyplus.com/';
      expect(getFrontendBaseUrl()).toBe('https://app.staging.matchyplus.com');
      expect(buildActivationLink('tok123')).toBe(
        'https://app.staging.matchyplus.com/activer?token=tok123',
      );
    });

    it('falls back to PUBLIC_APP_URL when APP_URL and FRONTEND_URL are unset', () => {
      process.env.PUBLIC_APP_URL = 'https://public.matchyplus.com/';
      expect(getFrontendBaseUrl()).toBe('https://public.matchyplus.com');
      expect(buildActivationLink('tok123')).toBe(
        'https://public.matchyplus.com/activer?token=tok123',
      );
    });

    it('falls back to NEXT_PUBLIC_APP_URL when earlier candidates are unset', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://next.matchyplus.com/';
      expect(getFrontendBaseUrl()).toBe('https://next.matchyplus.com');
      expect(buildActivationLink('tok123')).toBe(
        'https://next.matchyplus.com/activer?token=tok123',
      );
    });

    it('encodes special characters in token safely', () => {
      expect(buildActivationLink('token with spaces & symbols')).toBe(
        'http://localhost:3000/activer?token=token%20with%20spaces%20%26%20symbols',
      );
    });
  });
});
