import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationService } from './notification.js';

function createMockPrisma() {
  return {
    notification: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

function createService(prisma = createMockPrisma()) {
  const push = vi.fn();
  const service = new NotificationService({ prisma: prisma as never, push });
  return { service, prisma, push };
}

describe('NotificationService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('persists the notification and pushes a live event to the recipient', async () => {
      const { service, prisma, push } = createService();
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
          data: { path: ['viewerId'], equals: 'user-1' },
        },
        select: { id: true },
      });
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(push).toHaveBeenCalled();
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
        where: { user_id: 'user-2' },
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
        where: { user_id: 'user-2', read_at: null },
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
});
