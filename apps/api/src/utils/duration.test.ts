import { describe, expect, it } from 'vitest';

import { parseDurationSeconds } from './duration.js';

describe('parseDurationSeconds', () => {
  it('parses plain integer seconds', () => {
    expect(parseDurationSeconds('3600')).toBe(3600);
  });

  it('parses duration strings used in ACCESS_TOKEN_TTL', () => {
    expect(parseDurationSeconds('1h')).toBe(3600);
    expect(parseDurationSeconds('15m')).toBe(900);
    expect(parseDurationSeconds('30s')).toBe(30);
    expect(parseDurationSeconds('7d')).toBe(7 * 24 * 60 * 60);
  });

  it('rejects empty or invalid values', () => {
    expect(() => parseDurationSeconds('')).toThrow();
    expect(() => parseDurationSeconds('1x')).toThrow();
    expect(() => parseDurationSeconds('0')).toThrow();
    expect(() => parseDurationSeconds('-1h')).toThrow();
  });
});
