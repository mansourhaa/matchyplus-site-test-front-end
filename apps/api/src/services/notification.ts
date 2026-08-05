import { Prisma, PrismaClient } from '@saas-boilerplate/types';

import { NotificationEmailKind } from '../types/notification-emails.js';
import {
  CreateNotificationPayload,
  MarkNotificationReadParams,
  NotificationCategory,
  NotificationDedupeKey,
  NotificationListItem,
  NotificationPreferences,
  UpdateNotificationPreferencesBody,
} from '../types/notification.js';
import { AbstractServiceOptions } from '../types/services.js';
import { badRequest, notFound } from '../utils/http-errors.js';
import { NotificationEmailsService } from './notification-emails.js';

// P2034: "Transaction failed due to a write conflict or a deadlock" — Postgres's
// serializable-isolation write-skew detection. For a check-then-insert like the one below,
// this is exactly the signal that a concurrent call already resolved the same race.
function isSerializationFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
}

export type NotificationPusher = (
  userId: string,
  event: string,
  payload: Record<string, unknown>,
) => void;

const preferencesSelect = {
  notify_all: true,
  notify_matches: true,
  notify_messages: true,
  notify_views: true,
  notify_email: true,
} satisfies Prisma.UserSelect;

const CATEGORY_COLUMN: Record<NotificationCategory, keyof typeof preferencesSelect> = {
  matches: 'notify_matches',
  messages: 'notify_messages',
  views: 'notify_views',
};

function categoryForType(type: CreateNotificationPayload['type']): NotificationCategory {
  switch (type) {
    case 'MATCH':
    case 'MATCH_REQUEST':
      return 'matches';
    case 'MESSAGE':
      return 'messages';
    case 'PROFILE_VIEW':
      return 'views';
  }
}

function emailKindForType(type: CreateNotificationPayload['type']): NotificationEmailKind {
  switch (type) {
    case 'MESSAGE':
      return 'message';
    case 'MATCH':
      return 'match';
    case 'MATCH_REQUEST':
      return 'match_request';
    case 'PROFILE_VIEW':
      return 'profile_view';
  }
}

function actorNameFromPayload(payload: CreateNotificationPayload): string | undefined {
  switch (payload.type) {
    case 'PROFILE_VIEW':
      return payload.data.viewerName;
    case 'MESSAGE':
      return payload.data.sender_name;
    case 'MATCH_REQUEST':
      return payload.data.actor_first_name;
    case 'MATCH':
      return payload.data.actor_name;
  }
}

function toWirePreferences(row: {
  notify_all: boolean;
  notify_matches: boolean;
  notify_messages: boolean;
  notify_views: boolean;
  notify_email: boolean;
}): NotificationPreferences {
  return {
    all_enabled: row.notify_all,
    matches: row.notify_matches,
    messages: row.notify_messages,
    views: row.notify_views,
    email: row.notify_email,
  };
}

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

function defaultDedupeKey(payload: CreateNotificationPayload): NotificationDedupeKey | null {
  if (payload.type === 'PROFILE_VIEW') {
    return { path: ['viewerId'], equals: payload.data.viewerId };
  }
  return null;
}

/**
 * In-app notification feed. Every notification is written to the database first, so a
 * recipient who was offline at the time still sees it the next time they open the app;
 * a connected recipient additionally gets a live push over the realtime socket for
 * immediate feedback. Optional email delivery is fire-and-forget and never blocks the
 * triggering action.
 */
export class NotificationService {
  prisma: PrismaClient;
  push: NotificationPusher;
  emails: NotificationEmailsService;

  constructor(
    options: AbstractServiceOptions & {
      push?: NotificationPusher;
      emails?: NotificationEmailsService;
    },
  ) {
    this.prisma = options.prisma;
    this.push = options.push ?? (() => undefined);
    this.emails = options.emails ?? new NotificationEmailsService({ prisma: options.prisma });
  }

  /** MATCH_REQUEST shares the match channel so clients keep a single handler. */
  pushEventForType(type: CreateNotificationPayload['type']): string {
    if (type === 'MATCH_REQUEST') return 'notification_match';
    return `notification_${type.toLowerCase()}`;
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: preferencesSelect,
      });
      if (!user) throw notFound('user not found');
      return toWirePreferences(user);
    } catch (err) {
      throw err;
    }
  }

  async updatePreferences(
    userId: string,
    body: UpdateNotificationPreferencesBody,
  ): Promise<NotificationPreferences> {
    try {
      const data: Prisma.UserUpdateInput = {};
      if (typeof body.all_enabled === 'boolean') data.notify_all = body.all_enabled;
      if (typeof body.matches === 'boolean') data.notify_matches = body.matches;
      if (typeof body.messages === 'boolean') data.notify_messages = body.messages;
      if (typeof body.views === 'boolean') data.notify_views = body.views;
      if (typeof body.email === 'boolean') data.notify_email = body.email;

      if (Object.keys(data).length === 0) {
        throw badRequest('no preferences to update', 'no_preferences_to_update');
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data,
        select: preferencesSelect,
      });
      return toWirePreferences(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw notFound('user not found');
      }
      throw err;
    }
  }

  /** Master switch AND per-category toggle must both be on. */
  async isCategoryEnabled(userId: string, category: NotificationCategory): Promise<boolean> {
    try {
      const column = CATEGORY_COLUMN[category];
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { notify_all: true, [column]: true },
      });
      if (!user || !user.notify_all) return false;
      return Boolean(user[column]);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Persist + push when the in-app category is enabled. Email is independent: when the
   * inbox is muted we still queue email (gated only by `notify_email` + SMTP inside
   * NotificationEmailsService), matching the documented preference split.
   */
  async createIfEnabled(payload: CreateNotificationPayload): Promise<{ created: boolean }> {
    try {
      const enabled = await this.isCategoryEnabled(payload.userId, categoryForType(payload.type));
      if (!enabled) {
        this.queueEmail(payload);
        return { created: false };
      }
      await this.create(payload);
      return { created: true };
    } catch (err) {
      throw err;
    }
  }

  async create(payload: CreateNotificationPayload): Promise<void> {
    try {
      const row = await this.prisma.notification.create({
        data: {
          user_id: payload.userId,
          type: payload.type,
          data: payload.data,
        },
      });
      this.push(payload.userId, this.pushEventForType(payload.type), {
        ...(payload.data as unknown as Record<string, unknown>),
        notification_id: row.id,
      });
      this.queueEmail(payload);
    } catch (err) {
      throw err;
    }
  }

  async createIfNoRecentDuplicate(
    payload: CreateNotificationPayload,
    cooldownMs: number,
    dedupeKey?: NotificationDedupeKey,
  ): Promise<{ created: boolean }> {
    // The dedupe check and the insert run as one serializable transaction — otherwise two
    // concurrent /view calls for the same (recipient, viewer) pair can both pass the
    // find-first check before either commits and both insert, duplicating the row and the
    // push. Serializable isolation makes Postgres detect that write-skew and abort one of
    // the two transactions instead, which is caught below and treated as a clean dedupe.
    const key = dedupeKey ?? defaultDedupeKey(payload);

    try {
      const created = await this.prisma.$transaction(
        async (tx) => {
          const since = new Date(Date.now() - cooldownMs);
          const recent = await tx.notification.findFirst({
            where: {
              user_id: payload.userId,
              type: payload.type,
              created_at: { gte: since },
              AND: [
                // Silent email-only markers must not block a later in-app notification
                // after the user re-enables the category.
                { NOT: { data: { path: ['silent'], equals: true } } },
                ...(key ? [{ data: { path: key.path, equals: key.equals } }] : []),
              ],
            },
            select: { id: true },
          });
          if (recent) {
            return null;
          }

          return tx.notification.create({
            data: {
              user_id: payload.userId,
              type: payload.type,
              data: payload.data,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (created) {
        this.push(payload.userId, this.pushEventForType(payload.type), {
          ...(payload.data as unknown as Record<string, unknown>),
          notification_id: created.id,
        });
        this.queueEmail(payload);
        return { created: true };
      }
      return { created: false };
    } catch (err) {
      if (isSerializationFailure(err)) {
        return { created: false };
      }
      throw err;
    }
  }

  async createProfileViewIfEnabled(
    payload: Extract<CreateNotificationPayload, { type: 'PROFILE_VIEW' }>,
    cooldownMs: number,
  ): Promise<{ created: boolean }> {
    try {
      const enabled = await this.isCategoryEnabled(payload.userId, 'views');
      if (enabled) {
        return await this.createIfNoRecentDuplicate(payload, cooldownMs);
      }

      // Views muted — still respect the same viewer cooldown before emailing, using a
      // silent row so the next /view within the window does not re-mail (and does not
      // appear in the inbox / unread count).
      const key = { path: ['viewerId'], equals: payload.data.viewerId };
      const created = await this.prisma.$transaction(
        async (tx) => {
          const since = new Date(Date.now() - cooldownMs);
          const recent = await tx.notification.findFirst({
            where: {
              user_id: payload.userId,
              type: payload.type,
              created_at: { gte: since },
              data: { path: key.path, equals: key.equals },
            },
            select: { id: true },
          });
          if (recent) return false;

          await tx.notification.create({
            data: {
              user_id: payload.userId,
              type: payload.type,
              data: { ...payload.data, silent: true },
              read_at: new Date(),
            },
          });
          return true;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (created) {
        this.queueEmail(payload);
      }
      return { created: false };
    } catch (err) {
      if (isSerializationFailure(err)) {
        return { created: false };
      }
      throw err;
    }
  }

  private queueEmail(payload: CreateNotificationPayload): void {
    void this.emails
      .sendNotificationEmailToUser(payload.userId, {
        kind: emailKindForType(payload.type),
        actorName: actorNameFromPayload(payload),
      })
      .catch((err) => {
        console.warn('notification_email_failed', err);
      });
  }

  async list(userId: string): Promise<NotificationListItem[]> {
    try {
      const rows = await this.prisma.notification.findMany({
        where: {
          user_id: userId,
          // Silent cooldown markers (email-only profile views) stay out of the inbox.
          NOT: { data: { path: ['silent'], equals: true } },
        },
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
        where: {
          user_id: userId,
          read_at: null,
          NOT: { data: { path: ['silent'], equals: true } },
        },
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
