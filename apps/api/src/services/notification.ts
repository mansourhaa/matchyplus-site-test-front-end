import { PrismaClient } from '@saas-boilerplate/types';

import {
  CreateNotificationPayload,
  MarkNotificationReadParams,
  NotificationListItem,
} from '../types/notification.js';
import { AbstractServiceOptions } from '../types/services.js';
import { notFound } from '../utils/http-errors.js';

export type NotificationPusher = (
  userId: string,
  event: string,
  payload: Record<string, unknown>,
) => void;

function toListItem(row: {
  id: string;
  type: NotificationListItem['type'];
  data: unknown;
  read_at: Date | null;
  created_at: Date;
}): NotificationListItem {
  return {
    id: row.id,
    type: row.type,
    data: row.data as Record<string, unknown>,
    read: row.read_at !== null,
    created_at: row.created_at,
  };
}

/**
 * In-app notification feed. Every notification is written to the database first, so a
 * recipient who was offline at the time still sees it the next time they open the app;
 * a connected recipient additionally gets a live push over the realtime socket for
 * immediate feedback.
 */
export class NotificationService {
  prisma: PrismaClient;
  push: NotificationPusher;

  constructor(options: AbstractServiceOptions & { push?: NotificationPusher }) {
    this.prisma = options.prisma;
    this.push = options.push ?? (() => undefined);
  }

  async create(payload: CreateNotificationPayload): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          user_id: payload.userId,
          type: payload.type,
          data: payload.data,
        },
      });
      this.push(payload.userId, `notification_${payload.type.toLowerCase()}`, payload.data);
    } catch (err) {
      throw err;
    }
  }

  async list(userId: string): Promise<NotificationListItem[]> {
    try {
      const rows = await this.prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 50,
      });
      return rows.map(toListItem);
    } catch (err) {
      throw err;
    }
  }

  async unreadCount(userId: string): Promise<number> {
    try {
      return await this.prisma.notification.count({
        where: { user_id: userId, read_at: null },
      });
    } catch (err) {
      throw err;
    }
  }

  async markRead(userId: string, params: MarkNotificationReadParams): Promise<{ marked: true }> {
    try {
      const result = await this.prisma.notification.updateMany({
        where: { id: params.id, user_id: userId },
        data: { read_at: new Date() },
      });
      if (result.count === 0) {
        throw notFound('notification not found', 'notification_not_found');
      }
      return { marked: true };
    } catch (err) {
      throw err;
    }
  }

  async markAllRead(userId: string): Promise<{ marked: true }> {
    try {
      await this.prisma.notification.updateMany({
        where: { user_id: userId, read_at: null },
        data: { read_at: new Date() },
      });
      return { marked: true };
    } catch (err) {
      throw err;
    }
  }
}
