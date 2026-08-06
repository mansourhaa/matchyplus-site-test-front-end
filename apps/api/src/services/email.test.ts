import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildFromHeader,
  buildNotificationEmailHtml,
  escapeHtml,
  extractEmailAddress,
  hasSmtpConfig,
  readSmtpConfig,
} from './email.js';

/**
 * These tests only exercise pure config/rendering helpers. They never call `getTransporter`
 * or `sendNotificationEmail`, so no SMTP connection is ever opened.
 */
describe('email transport config', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    // Start from a clean slate so leaked SMTP_* from the shell cannot affect the assertions.
    process.env = {
      ...OLD_ENV,
      SMTP_HOST: undefined,
      SMTP_PORT: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      SMTP_FROM: undefined,
      SMTP_SECURE: undefined,
      SMTP_FROM_NAME: undefined,
    } as NodeJS.ProcessEnv;
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('defaults the port to 587 and infers secure only on 465', () => {
    expect(readSmtpConfig().port).toBe(587);
    expect(readSmtpConfig().secure).toBe(false);

    process.env.SMTP_PORT = '465';
    expect(readSmtpConfig().secure).toBe(true);
  });

  it('lets SMTP_SECURE override the port-based default', () => {
    process.env.SMTP_PORT = '465';
    process.env.SMTP_SECURE = 'false';
    expect(readSmtpConfig().secure).toBe(false);

    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'true';
    expect(readSmtpConfig().secure).toBe(true);
  });

  it('hasSmtpConfig is false until every required field is present', () => {
    expect(hasSmtpConfig()).toBe(false);

    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'secret';
    // Still no valid FROM/USER email address, so buildFromHeader fails.
    expect(hasSmtpConfig()).toBe(false);

    process.env.SMTP_FROM = 'Matchy <no-reply@matchy.test>';
    expect(hasSmtpConfig()).toBe(true);
  });

  it('extracts an address from a "Name <addr>" header or a bare address', () => {
    expect(extractEmailAddress('Matchy <no-reply@matchy.test>')).toBe('no-reply@matchy.test');
    expect(extractEmailAddress('plain@matchy.test')).toBe('plain@matchy.test');
    expect(extractEmailAddress('not-an-email')).toBeNull();
    expect(extractEmailAddress('')).toBeNull();
  });

  it('builds a from-header with the configured display name', () => {
    process.env.SMTP_FROM = 'no-reply@matchy.test';
    process.env.SMTP_FROM_NAME = 'Matchy Team';
    expect(buildFromHeader()).toEqual({ name: 'Matchy Team', address: 'no-reply@matchy.test' });
  });
});

describe('email rendering', () => {
  it('escapes HTML so a hostile actor name cannot inject markup', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('renders the title and body, escaping the body content', () => {
    const html = buildNotificationEmailHtml({
      title: 'Nouveau match',
      body: 'Nour <b>x</b> vous a matché',
      appName: 'Matchy+',
    });
    expect(html).toContain('Nouveau match');
    expect(html).toContain('Nour &lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>x</b>');
  });
});
