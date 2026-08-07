import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetTransporterCache } from './email.js';
import { NotificationEmailsService } from './notification-emails.js';

/**
 * Integration test that sends a *real* email through the SMTP transport to a local Mailpit
 * server and verifies receipt via Mailpit's REST API — the end-to-end proof the unit tests
 * (which mock the transport) cannot give.
 *
 * Start Mailpit first: `docker compose -f compose.dev.yaml up -d mailpit`. When Mailpit is not
 * reachable the whole suite is skipped, so `pnpm test` stays green without the container.
 */
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

async function mailpitReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${MAILPIT_URL}/livez`);
    return res.ok;
  } catch {
    return false;
  }
}

async function clearMailpit(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' });
}

type MailpitMessage = { Subject: string; To: Array<{ Address: string }> };

async function listMailpit(): Promise<MailpitMessage[]> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/messages`);
  const body = (await res.json()) as { messages: MailpitMessage[] };
  return body.messages;
}

/** Wait briefly for a message matching `predicate` (send is accepted, then indexed by Mailpit). */
async function waitForMessage(
  predicate: (m: MailpitMessage) => boolean,
  timeoutMs = 3000,
): Promise<MailpitMessage | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = (await listMailpit()).find(predicate);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
}

const up = await mailpitReachable();

describe.skipIf(!up)('NotificationEmailsService → Mailpit (SMTP integration)', () => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    // Point the transport at Mailpit. Placeholders only — Mailpit accepts any credentials.
    process.env = {
      ...OLD_ENV,
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
      SMTP_USER: 'matchy-test',
      SMTP_PASS: 'matchy-test',
      SMTP_FROM: 'Matchy+ <no-reply@matchy.local>',
      SMTP_SECURE: 'false',
      SMTP_FROM_NAME: 'Matchy+',
      APP_NAME: 'Matchy+',
      APP_URL: 'http://localhost:3000',
    } as NodeJS.ProcessEnv;
    resetTransporterCache();
  });

  afterAll(() => {
    process.env = OLD_ENV;
    resetTransporterCache();
  });

  beforeEach(async () => {
    await clearMailpit();
  });

  function serviceForUser(user: { email: string; notify_email: boolean } | null) {
    const prisma = { user: { findUnique: vi.fn().mockResolvedValue(user) } };
    // No emailService injected: the real EmailService (real nodemailer transport) is used.
    return new NotificationEmailsService({ prisma: prisma as never });
  }

  it('delivers a profile_view email that Mailpit actually receives', async () => {
    const service = serviceForUser({ email: 'dest@matchy.test', notify_email: true });

    const sent = await service.sendNotificationEmailToUser('u1', { kind: 'profile_view' });
    expect(sent).toBe(true);

    const message = await waitForMessage(
      (m) =>
        m.Subject === 'Vue de profil sur Matchy+' &&
        m.To.some((t) => t.Address === 'dest@matchy.test'),
    );
    expect(message).toBeDefined();
  });

  it('delivers the match email with its own subject', async () => {
    const service = serviceForUser({ email: 'dest@matchy.test', notify_email: true });

    const sent = await service.sendNotificationEmailToUser('u1', {
      kind: 'match',
      actorName: 'Nour',
    });
    expect(sent).toBe(true);

    const message = await waitForMessage((m) => m.Subject === 'Nouveau match sur Matchy+');
    expect(message).toBeDefined();
  });

  it('sends nothing when the recipient opted out of email notifications', async () => {
    const service = serviceForUser({ email: 'dest@matchy.test', notify_email: false });

    const sent = await service.sendNotificationEmailToUser('u1', { kind: 'profile_view' });
    expect(sent).toBe(false);

    // Give any (erroneous) delivery a chance to land, then assert the inbox stayed empty.
    const message = await waitForMessage(() => true, 500);
    expect(message).toBeUndefined();
  });
});
