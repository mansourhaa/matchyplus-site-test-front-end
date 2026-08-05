import { afterEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@saas-boilerplate/types';

import { NotificationService } from './notification.js';

function createMockPrisma() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback(prisma),
  );
  return prisma;
}

function createFakeEmails() {
  return {
    sendNotificationEmailToUser: vi.fn().mockResolvedValue(false),
  };
}

function createService(prisma = createMockPrisma()) {
  const push = vi.fn();
  const emails = createFakeEmails();
  const service = new NotificationService({
    prisma: prisma as never,
    push,
    emails: emails as never,
  });
  return { service, prisma, push, emails };
}

const enabledPrefs = {
  notify_all: true,
  notify_matches: true,
  notify_messages: true,
  notify_views: true,
  notify_email: true,
};

describe('NotificationService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('pushEventForType', () => {
    it('maps MATCH_REQUEST to notification_match and others to notification_<type>', () => {
      const { service } = createService();
      expect(service.pushEventForType('MATCH_REQUEST')).toBe('notification_match');
      expect(service.pushEventForType('MATCH')).toBe('notification_match');
      expect(service.pushEventForType('MESSAGE')).toBe('notification_message');
      expect(service.pushEventForType('PROFILE_VIEW')).toBe('notification_profile_view');
    });
  });

  describe('getPreferences / updatePreferences', () => {
    it('returns snake_case wire preferences', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(enabledPrefs);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual({
        all_enabled: true,
        matches: true,
        messages: true,
        views: true,
        email: true,
      });
    });

    it('updates only the toggles present in the body', async () => {
      const { service, prisma } = createService();
      prisma.user.update.mockResolvedValue({
        ...enabledPrefs,
        notify_views: false,
      });

      const result = await service.updatePreferences('user-1', { views: false });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { notify_views: false },
        select: expect.any(Object),
      });
      expect(result.views).toBe(false);
    });

    it('rejects an empty preferences body', async () => {
      const { service } = createService();
      await expect(service.updatePreferences('user-1', {})).rejects.toMatchObject({
        code: 'no_preferences_to_update',
      });
    });
  });

  describe('createIfEnabled', () => {
    it('skips persist and push when the category is disabled, but still queues email', async () => {
      const { service, prisma, push, emails } = createService();
      prisma.user.findUnique.mockResolvedValue({ notify_all: true, notify_views: false });

      const result = await service.createIfEnabled({
        userId: 'user-2',
        type: 'PROFILE_VIEW',
        data: { viewerId: 'user-1', viewerName: 'Jane', viewerImage: null },
      });

      expect(result).toEqual({ created: false });
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
      expect(emails.sendNotificationEmailToUser).toHaveBeenCalledWith('user-2', {
        kind: 'profile_view',
        actorName: 'Jane',
      });
    });

    it('creates when master and category are enabled', async () => {
      const { service, prisma, push } = createService();
      prisma.user.findUnique.mockResolvedValue({ notify_all: true, notify_views: true });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.createIfEnabled({
        userId: 'user-2',
        type: 'PROFILE_VIEW',
        data: { viewerId: 'user-1', viewerName: 'Jane', viewerImage: null },
      });

      expect(result).toEqual({ created: true });
      expect(push).toHaveBeenCalledWith(
        'user-2',
        'notification_profile_view',
        expect.objectContaining({ notification_id: 'notif-1' }),
      );
    });
  });

  describe('create', () => {
    it('persists the notification, pushes with notification_id, and queues email', async () => {
      const { service, prisma, push, emails } = createService();
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.create({
        userId: 'user-2',
        type: 'PROFILE_VIEW',
        data: { viewerId: 'user-1', viewerName: 'Jane', viewerImage: null },
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-2',
          type: 'PROFILE_VIEW',
          data: { viewerId: 'user-1', viewerName: 'Jane', viewerImage: null },
        },
      });
      expect(push).toHaveBeenCalledWith('user-2', 'notification_profile_view', {
        viewerId: 'user-1',
        viewerName: 'Jane',
        viewerImage: null,
        notification_id: 'notif-1',
      });
      expect(emails.sendNotificationEmailToUser).toHaveBeenCalledWith('user-2', {
        kind: 'profile_view',
        actorName: 'Jane',
      });
    });

    it('pushes MATCH_REQUEST on the notification_match channel', async () => {
      const { service, prisma, push, emails } = createService();
      prisma.notification.create.mockResolvedValue({ id: 'notif-2' });

      await service.create({
        userId: 'user-2',
        type: 'MATCH_REQUEST',
        data: {
          event_type: 'match_request',
          actor_first_name: 'Alice',
          sender_picture: null,
          from_user_id: 'user-1',
        },
      });

      expect(push).toHaveBeenCalledWith(
        'user-2',
        'notification_match',
        expect.objectContaining({
          event_type: 'match_request',
          notification_id: 'notif-2',
        }),
      );
      expect(emails.sendNotificationEmailToUser).toHaveBeenCalledWith('user-2', {
        kind: 'match_request',
        actorName: 'Alice',
      });
    });
  });

  describe('createIfNoRecentDuplicate', () => {
    const payload = {
      userId: 'user-2',
      type: 'PROFILE_VIEW' as const,
      data: { viewerId: 'user-1', viewerName: 'Jane', viewerImage: null },
    };

    it('creates and pushes when there is no recent notification from the same viewer', async () => {
      const { service, prisma, push } = createService();
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.createIfNoRecentDuplicate(payload, 15 * 60 * 1000);

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: 'user-2',
          type: 'PROFILE_VIEW',
          created_at: { gte: expect.any(Date) },
          AND: [
            { NOT: { data: { path: ['silent'], equals: true } } },
            { data: { path: ['viewerId'], equals: 'user-1' } },
          ],
        },
        select: { id: true },
      });
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith(
        'user-2',
        'notification_profile_view',
        expect.objectContaining({ notification_id: 'notif-1' }),
      );
      expect(result).toEqual({ created: true });
    });

    it('skips the write and the push when the same viewer already notified this recipient recently', async () => {
      const { service, prisma, push } = createService();
      prisma.notification.findFirst.mockResolvedValue({ id: 'existing-notif' });

      const result = await service.createIfNoRecentDuplicate(payload, 15 * 60 * 1000);

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
      expect(result).toEqual({ created: false });
    });

    it('runs the dedupe check and the insert inside a serializable transaction', async () => {
      const { service, prisma } = createService();
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.createIfNoRecentDuplicate(payload, 15 * 60 * 1000);

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    });

    it('treats a concurrent write-conflict as a clean dedupe instead of a raw failure', async () => {
      const { service, prisma, push } = createService();
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('write conflict', {
          code: 'P2034',
          clientVersion: 'test',
        }),
      );

      const result = await service.createIfNoRecentDuplicate(payload, 15 * 60 * 1000);

      expect(result).toEqual({ created: false });
      expect(push).not.toHaveBeenCalled();
    });

    it('propagates an unrelated transaction failure', async () => {
      const { service, prisma } = createService();
      prisma.$transaction.mockRejectedValue(new Error('connection lost'));

      await expect(service.createIfNoRecentDuplicate(payload, 15 * 60 * 1000)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('createProfileViewIfEnabled', () => {
    it('writes a silent cooldown marker and queues email when views are muted', async () => {
      const { service, prisma, push, emails } = createService();
      prisma.user.findUnique.mockResolvedValue({ notify_all: false, notify_views: true });
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({ id: 'silent-1' });

      const result = await service.createProfileViewIfEnabled(
        {
          userId: 'user-2',
          type: 'PROFILE_VIEW',
          data: { viewerId: 'user-1', viewerName: 'Jane', viewerImage: null },
        },
        15 * 60 * 1000,
      );

      expect(result).toEqual({ created: false });
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-2',
          type: 'PROFILE_VIEW',
          data: {
            viewerId: 'user-1',
            viewerName: 'Jane',
            viewerImage: null,
            silent: true,
          },
          read_at: expect.any(Date),
        },
      });
      expect(push).not.toHaveBeenCalled();
      expect(emails.sendNotificationEmailToUser).toHaveBeenCalledWith('user-2', {
        kind: 'profile_view',
        actorName: 'Jane',
      });
    });

    it('skips email when a silent/in-app view already exists inside the cooldown', async () => {
      const { service, prisma, emails } = createService();
      prisma.user.findUnique.mockResolvedValue({ notify_all: true, notify_views: false });
      prisma.notification.findFirst.mockResolvedValue({ id: 'recent' });

      const result = await service.createProfileViewIfEnabled(
        {
          userId: 'user-2',
          type: 'PROFILE_VIEW',
          data: { viewerId: 'user-1', viewerName: 'Jane', viewerImage: null },
        },
        15 * 60 * 1000,
      );

      expect(result).toEqual({ created: false });
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(emails.sendNotificationEmailToUser).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns the most recent notifications with a boolean read flag', async () => {
      const { service, prisma } = createService();
      const createdAt = new Date('2026-01-01T00:00:00Z');
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          type: 'PROFILE_VIEW',
          data: { viewerId: 'user-1', viewerName: 'Jane Doe' },
          read_at: null,
          created_at: createdAt,
        },
        {
          id: 'notif-2',
          type: 'PROFILE_VIEW',
          data: { viewerId: 'user-3', viewerName: 'John Doe' },
          read_at: createdAt,
          created_at: createdAt,
        },
      ]);

      const result = await service.list('user-2');

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          user_id: 'user-2',
          NOT: { data: { path: ['silent'], equals: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 50,
      });
      expect(result).toEqual([
        {
          id: 'notif-1',
          type: 'PROFILE_VIEW',
          data: { viewerId: 'user-1', viewerName: 'Jane Doe' },
          read: false,
          created_at: createdAt,
        },
        {
          id: 'notif-2',
          type: 'PROFILE_VIEW',
          data: { viewerId: 'user-3', viewerName: 'John Doe' },
          read: true,
          created_at: createdAt,
        },
      ]);
    });
  });

  describe('unreadCount', () => {
    it('counts only unread notifications for the given user', async () => {
      const { service, prisma } = createService();
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.unreadCount('user-2');

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          user_id: 'user-2',
          read_at: null,
          NOT: { data: { path: ['silent'], equals: true } },
        },
      });
      expect(result).toBe(3);
    });
  });

  describe('markRead', () => {
    it('marks a notification owned by the caller as read', async () => {
      const { service, prisma } = createService();
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markRead('user-2', { id: 'notif-1' });

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', user_id: 'user-2' },
        data: { read_at: expect.any(Date) },
      });
      expect(result).toEqual({ marked: true });
    });

    it('rejects marking a notification that does not belong to the caller (or does not exist)', async () => {
      const { service, prisma } = createService();
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.markRead('user-2', { id: 'notif-1' })).rejects.toMatchObject({
        code: 'notification_not_found',
      });
    });
  });

  describe('markAllRead', () => {
    it('marks every unread notification for the caller as read', async () => {
      const { service, prisma } = createService();
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllRead('user-2');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'user-2', read_at: null },
        data: { read_at: expect.any(Date) },
      });
      expect(result).toEqual({ marked: true });
    });
  });

  describe('retractMatchRequest', () => {
    it('deletes MATCH_REQUEST rows for the pair and pushes notifications_updated', async () => {
      const { service, prisma, push } = createService();
      prisma.notification.deleteMany.mockResolvedValue({ count: 1 });

      const count = await service.retractMatchRequest('user-2', 'user-1');

      expect(count).toBe(1);
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          user_id: 'user-2',
          type: 'MATCH_REQUEST',
          data: { path: ['from_user_id'], equals: 'user-1' },
        },
      });
      expect(push).toHaveBeenCalledWith(
        'user-2',
        'notifications_updated',
        expect.objectContaining({ reason: 'match_request_retracted' }),
      );
    });

    it('does not push when nothing was deleted', async () => {
      const { service, prisma, push } = createService();
      prisma.notification.deleteMany.mockResolvedValue({ count: 0 });

      await service.retractMatchRequest('user-2', 'user-1');
      expect(push).not.toHaveBeenCalled();
    });
  });

  describe('retractMatchRequestsBetween', () => {
    it('deletes MATCH_REQUEST rows in either direction for the pair', async () => {
      const { service, prisma } = createService();
      prisma.notification.deleteMany.mockResolvedValue({ count: 2 });

      const count = await service.retractMatchRequestsBetween('u1', 'u2');

      expect(count).toBe(2);
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          type: 'MATCH_REQUEST',
          OR: [
            { user_id: 'u1', data: { path: ['from_user_id'], equals: 'u2' } },
            { user_id: 'u2', data: { path: ['from_user_id'], equals: 'u1' } },
          ],
        },
      });
    });
  });
});
