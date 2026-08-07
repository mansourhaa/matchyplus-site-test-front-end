import { describe, expect, it } from 'vitest';

import { formatAddressParts, parseLatLon } from './geo-coords.js';
import { encodeIpForPath, parseIpAddress } from './ip.js';

describe('parseIpAddress', () => {
  it('accepts IPv4', () => {
    expect(parseIpAddress('8.8.8.8')).toBe('8.8.8.8');
    expect(parseIpAddress(' 203.0.113.1 ')).toBe('203.0.113.1');
  });

  it('accepts IPv6', () => {
    expect(parseIpAddress('2001:db8::1')).toBe('2001:db8::1');
    expect(parseIpAddress('[2001:db8::1]')).toBe('2001:db8::1');
  });

  it('rejects empty, hostnames, and garbage', () => {
    expect(parseIpAddress('')).toBeNull();
    expect(parseIpAddress('   ')).toBeNull();
    expect(parseIpAddress(undefined)).toBeNull();
    expect(parseIpAddress('example.com')).toBeNull();
    expect(parseIpAddress('http://8.8.8.8')).toBeNull();
    expect(parseIpAddress('999.1.1.1')).toBeNull();
  });
});

describe('encodeIpForPath', () => {
  it('percent-encodes IPv6 colons', () => {
    expect(encodeIpForPath('2001:db8::1')).toBe('2001%3Adb8%3A%3A1');
  });

  it('leaves IPv4 unchanged', () => {
    expect(encodeIpForPath('8.8.8.8')).toBe('8.8.8.8');
  });
});

describe('parseLatLon', () => {
  it('accepts zero coordinates', () => {
    expect(parseLatLon(0, 0)).toEqual({ lat: 0, lon: 0 });
  });

  it('accepts numeric strings', () => {
    expect(parseLatLon('36.8', '10.1')).toEqual({ lat: 36.8, lon: 10.1 });
  });

  it('rejects out-of-range and non-finite values', () => {
    expect(parseLatLon(91, 0)).toBeNull();
    expect(parseLatLon(0, 181)).toBeNull();
    expect(parseLatLon(NaN, 0)).toBeNull();
    expect(parseLatLon(null, 0)).toBeNull();
    expect(parseLatLon('', '10')).toBeNull();
  });
});

describe('formatAddressParts', () => {
  it('joins non-empty parts', () => {
    expect(formatAddressParts('Tunis', 'Tunis', 'Tunisia')).toBe('Tunis, Tunis, Tunisia');
    expect(formatAddressParts('Tunis', null, 'Tunisia')).toBe('Tunis, Tunisia');
    expect(formatAddressParts(null, null, null)).toBeNull();
  });
});
