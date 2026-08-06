import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailService } from './email.js';
import { NotificationEmailsService, buildNotificationEmailPayload } from './notification-emails.js';

function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
    },
  };
}

/** A fake transport: SMTP configured and a send spy — never a real connection. */
function createFakeEmailService(hasSmtp = true) {
  return {
    hasSmtpConfig: vi.fn().mockReturnValue(hasSmtp),
    sendNotificationEmail: vi.fn().mockResolvedValue(undefined),
  } as unknown as EmailService & {
    hasSmtpConfig: ReturnType<typeof vi.fn>;
    sendNotificationEmail: ReturnType<typeof vi.fn>;
  };
}

describe('buildNotificationEmailPayload', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV, APP_URL: 'https://app.matchy.test' };
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('builds the message payload with the actor name and messages link', () => {
    const payload = buildNotificationEmailPayload({ kind: 'message', actorName: 'Sami' });
    expect(payload.subject).toContain('Nouveau message');
    expect(payload.body).toContain('Sami');
    expect(payload.actionUrl).toBe('https://app.matchy.test/matches');
  });

  it('builds the match payload', () => {
    const payload = buildNotificationEmailPayload({ kind: 'match', actorName: 'Nour' });
    expect(payload.title).toBe('Nouveau match');
    expect(payload.body).toContain('Nour');
    expect(payload.actionUrl).toBe('https://app.matchy.test/matches');
  });

  it('builds the match_request payload separately from mutual match', () => {
    const payload = buildNotificationEmailPayload({ kind: 'match_request', actorName: 'Alice' });
    expect(payload.title).toBe('Demande de match');
    expect(payload.body).toContain('Alice');
    expect(payload.actionUrl).toBe('https://app.matchy.test/discover');
  });

  it('builds the profile_view payload without leaking the viewer identity', () => {
    const payload = buildNotificationEmailPayload({ kind: 'profile_view', actorName: 'Sami' });
    expect(payload.title).toBe('Vue de profil');
    // The reference never names the viewer in a profile-view email.
    expect(payload.body).not.toContain('Sami');
    expect(payload.actionUrl).toBe('https://app.matchy.test/notifications');
  });

  it('falls back to a default actor and generic body for new_profile', () => {
    const payload = buildNotificationEmailPayload({ kind: 'new_profile' });
    expect(payload.title).toBe('Nouveau profil');
    expect(payload.body).toContain('Un utilisateur');
  });
});

describe('NotificationEmailsService.isNotificationEmailEnabledForUser', () => {
  it('reflects the notify_email column', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ notify_email: true });
    const service = new NotificationEmailsService({
      prisma: prisma as never,
      emailService: createFakeEmailService(),
    });

    await expect(service.isNotificationEmailEnabledForUser('u1')).resolves.toBe(true);
    expect(prisma.user.findUnique.mock.calls[0][0]).toMatchObject({
      where: { id: 'u1' },
      select: { notify_email: true },
    });
  });

  it('is false for a missing user', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new NotificationEmailsService({
      prisma: prisma as never,
      emailService: createFakeEmailService(),
    });

    await expect(service.isNotificationEmailEnabledForUser('ghost')).resolves.toBe(false);
  });
});

describe('NotificationEmailsService.sendNotificationEmailToUser', () => {
  it('sends when SMTP is configured, the user has an address and opted in', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ email: 'u@x.tn', notify_email: true });
    const email = createFakeEmailService(true);
    const service = new NotificationEmailsService({ prisma: prisma as never, emailService: email });

    await expect(
      service.sendNotificationEmailToUser('u1', { kind: 'match', actorName: 'Nour' }),
    ).resolves.toBe(true);

    expect(email.sendNotificationEmail).toHaveBeenCalledTimes(1);
    expect(email.sendNotificationEmail.mock.calls[0][0]).toMatchObject({
      to: 'u@x.tn',
      subject: 'Nouveau match sur Matchy+',
      title: 'Nouveau match',
    });
  });

  it('does not send, and does not even query the user, when SMTP is not configured', async () => {
    const prisma = createMockPrisma();
    const email = createFakeEmailService(false);
    const service = new NotificationEmailsService({ prisma: prisma as never, emailService: email });

    await expect(service.sendNotificationEmailToUser('u1', { kind: 'message' })).resolves.toBe(
      false,
    );

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(email.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('does not send when the user opted out of email notifications', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ email: 'u@x.tn', notify_email: false });
    const email = createFakeEmailService(true);
    const service = new NotificationEmailsService({ prisma: prisma as never, emailService: email });

    await expect(service.sendNotificationEmailToUser('u1', { kind: 'message' })).resolves.toBe(
      false,
    );
    expect(email.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('does not send when the user has no email address', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ email: '', notify_email: true });
    const email = createFakeEmailService(true);
    const service = new NotificationEmailsService({ prisma: prisma as never, emailService: email });

    await expect(service.sendNotificationEmailToUser('u1', { kind: 'message' })).resolves.toBe(
      false,
    );
    expect(email.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('does not send for a missing user', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const email = createFakeEmailService(true);
    const service = new NotificationEmailsService({ prisma: prisma as never, emailService: email });

    await expect(service.sendNotificationEmailToUser('ghost', { kind: 'message' })).resolves.toBe(
      false,
    );
    expect(email.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('propagates a transport error so the caller can log it (call sites use catch)', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ email: 'u@x.tn', notify_email: true });
    const email = createFakeEmailService(true);
    email.sendNotificationEmail.mockRejectedValue(new Error('smtp down'));
    const service = new NotificationEmailsService({ prisma: prisma as never, emailService: email });

    await expect(service.sendNotificationEmailToUser('u1', { kind: 'message' })).rejects.toThrow(
      'smtp down',
    );
  });
});
