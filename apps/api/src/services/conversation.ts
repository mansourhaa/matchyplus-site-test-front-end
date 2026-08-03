import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { MessageType, Prisma, PrismaClient } from '@saas-boilerplate/types';

import {
  ALLOWED_VOICE_AUDIO_MIMES,
  MESSAGES_PAGE_SIZE,
  MESSAGES_PAGE_SIZE_MAX,
  VOICE_AUDIO_MAX_BYTES,
} from '../constants.js';
import {
  ConversationInboxRow,
  ListMessagesQuery,
  MessageQuota,
  MessageRow,
  SendMessageBody,
} from '../types/conversations.js';
import { AbstractServiceOptions } from '../types/services.js';
import { badRequest, forbidden, notFound, tooManyRequests } from '../utils/http-errors.js';
import { orderedUserPair, otherUserId } from '../utils/match-pair.js';
import { AUDIO_DIR } from '../utils/media-storage.js';
import { validateUploadedFile } from '../utils/media-validation.js';
import { utcDayBounds } from '../utils/utc-day.js';
import { MessageQuotaService } from './message-quota.js';

export type ConversationNotifier = (
  userId: string,
  event: string,
  payload: Record<string, unknown>,
) => void;

type UploadedFile = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
};

const peerSelect = {
  id: true,
  name: true,
  image: true,
  bio: true,
  job: true,
  category: true,
  city: true,
} as const;

/**
 * Messaging domain: inbox, history, send, likes, voice upload, match lifecycle hooks.
 * Matching calls ensureForMatch / detachOnUnmatch; this service owns Conversation rows.
 */
export class ConversationService {
  prisma: PrismaClient;
  quota: MessageQuotaService;
  notify: ConversationNotifier;

  constructor(options: AbstractServiceOptions & { notify?: ConversationNotifier }) {
    this.prisma = options.prisma;
    this.quota = new MessageQuotaService({ prisma: options.prisma });
    this.notify = options.notify ?? (() => undefined);
  }

  private async assertParticipant(conversationId: string, userId: string) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      // Same 404 for missing and non-participant — avoid conversation-id enumeration.
      if (
        !conversation ||
        (conversation.user_low_id !== userId && conversation.user_high_id !== userId)
      ) {
        throw notFound('conversation not found');
      }
      return conversation;
    } catch (err) {
      throw err;
    }
  }

  private async blockFlags(userId: string, peerId: string) {
    try {
      const [iBlocked, blockedMe] = await Promise.all([
        this.prisma.userBlock.findFirst({
          where: { blocker_id: userId, blocked_id: peerId },
          select: { id: true },
        }),
        this.prisma.userBlock.findFirst({
          where: { blocker_id: peerId, blocked_id: userId },
          select: { id: true },
        }),
      ]);
      return { i_blocked: Boolean(iBlocked), blocked_me: Boolean(blockedMe) };
    } catch (err) {
      throw err;
    }
  }

  private peerIdOf(
    conversation: { user_low_id: string; user_high_id: string },
    userId: string,
  ): string {
    return otherUserId(
      { userLowId: conversation.user_low_id, userHighId: conversation.user_high_id },
      userId,
    );
  }

  private canSend(hasActiveMatch: boolean, iBlocked: boolean, blockedMe: boolean): boolean {
    return hasActiveMatch && !iBlocked && !blockedMe;
  }

  /**
   * Race-safe create-or-reattach for a mutual match.
   * Unique on ordered pair prevents duplicate threads; rematch updates match_id.
   */
  async ensureForMatch(matchId: string, userA: string, userB: string): Promise<{ id: string }> {
    try {
      if (!matchId) throw badRequest('match id is required');
      if (!userA || !userB || userA === userB) throw badRequest('invalid match participants');

      const pair = orderedUserPair(userA, userB);

      const conversation = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.conversation.findUnique({
          where: {
            user_low_id_user_high_id: {
              user_low_id: pair.userLowId,
              user_high_id: pair.userHighId,
            },
          },
        });

        if (existing) {
          if (existing.match_id !== matchId) {
            return tx.conversation.update({
              where: { id: existing.id },
              data: { match_id: matchId },
            });
          }
          return existing;
        }

        try {
          return await tx.conversation.create({
            data: {
              match_id: matchId,
              user_low_id: pair.userLowId,
              user_high_id: pair.userHighId,
            },
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            const raced = await tx.conversation.findUnique({
              where: {
                user_low_id_user_high_id: {
                  user_low_id: pair.userLowId,
                  user_high_id: pair.userHighId,
                },
              },
            });
            if (!raced) throw err;
            return tx.conversation.update({
              where: { id: raced.id },
              data: { match_id: matchId },
            });
          }
          throw err;
        }
      });

      return { id: conversation.id };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Null match_id and keep history. Call only after Match delete has succeeded
   * (or inside the same transaction as that delete) so a failed unmatch cannot
   * leave an active Match with can_send already false.
   */
  async detachOnUnmatch(
    userId: string,
    otherUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ conversation_id: string | null }> {
    try {
      const db = tx ?? this.prisma;
      const pair = orderedUserPair(userId, otherUserId);
      const conversation = await db.conversation.findUnique({
        where: {
          user_low_id_user_high_id: {
            user_low_id: pair.userLowId,
            user_high_id: pair.userHighId,
          },
        },
      });
      if (!conversation) return { conversation_id: null };

      if (conversation.match_id !== null) {
        await db.conversation.update({
          where: { id: conversation.id },
          data: { match_id: null },
        });
      }

      return { conversation_id: conversation.id };
    } catch (err) {
      throw err;
    }
  }

  /** Fan-out read-only status after a successful unmatch detach. */
  async notifyUnmatchedStatus(userId: string, otherUserId: string): Promise<void> {
    try {
      const pair = orderedUserPair(userId, otherUserId);
      const conversation = await this.prisma.conversation.findUnique({
        where: {
          user_low_id_user_high_id: {
            user_low_id: pair.userLowId,
            user_high_id: pair.userHighId,
          },
        },
        select: { id: true },
      });
      if (!conversation) return;

      const payload = {
        conversation_id: conversation.id,
        has_active_match: false,
        can_send: false,
      };
      this.notify(userId, 'conversation_status_changed', payload);
      this.notify(otherUserId, 'conversation_status_changed', payload);
    } catch (err) {
      throw err;
    }
  }

  async notifyBlockStatus(blockerId: string, blockedId: string): Promise<void> {
    try {
      const pair = orderedUserPair(blockerId, blockedId);
      const conversation = await this.prisma.conversation.findUnique({
        where: {
          user_low_id_user_high_id: {
            user_low_id: pair.userLowId,
            user_high_id: pair.userHighId,
          },
        },
      });
      if (!conversation) return;

      for (const viewerId of [blockerId, blockedId]) {
        const peerId = this.peerIdOf(conversation, viewerId);
        const flags = await this.blockFlags(viewerId, peerId);
        this.notify(viewerId, 'conversation_block_status_changed', {
          conversation_id: conversation.id,
          ...flags,
          has_active_match: Boolean(conversation.match_id),
          can_send: this.canSend(Boolean(conversation.match_id), flags.i_blocked, flags.blocked_me),
        });
      }
    } catch (err) {
      throw err;
    }
  }

  async listInbox(
    userId: string,
  ): Promise<{ conversations: ConversationInboxRow[]; count: number }> {
    try {
      const rows = await this.prisma.conversation.findMany({
        where: {
          OR: [{ user_low_id: userId }, { user_high_id: userId }],
        },
        orderBy: { updated_at: 'desc' },
        include: {
          messages: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      });

      const peerIds = rows.map((row) => this.peerIdOf(row, userId));
      const peers = await this.prisma.user.findMany({
        where: { id: { in: peerIds } },
        select: peerSelect,
      });
      const peerById = new Map(peers.map((p) => [p.id, p]));

      const conversations: ConversationInboxRow[] = [];
      for (const row of rows) {
        const peerId = this.peerIdOf(row, userId);
        const flags = await this.blockFlags(userId, peerId);
        const unread_count = await this.prisma.message.count({
          where: {
            conversation_id: row.id,
            sender_id: { not: userId },
            is_read: false,
          },
        });
        const last = row.messages[0] ?? null;
        const has_active_match = Boolean(row.match_id);
        conversations.push({
          conversation_id: row.id,
          match_id: row.match_id,
          has_active_match,
          peer: peerById.get(peerId) ?? null,
          last_message: last
            ? {
                id: last.id,
                content: last.content,
                message_type: last.message_type,
                sender_id: last.sender_id,
                is_read: last.is_read,
                created_at: last.created_at,
              }
            : null,
          unread_count,
          i_blocked: flags.i_blocked,
          blocked_me: flags.blocked_me,
          can_send: this.canSend(has_active_match, flags.i_blocked, flags.blocked_me),
          updated_at: row.updated_at,
          created_at: row.created_at,
        });
      }

      return { conversations, count: conversations.length };
    } catch (err) {
      throw err;
    }
  }

  async getConversation(userId: string, conversationId: string) {
    try {
      const conversation = await this.assertParticipant(conversationId, userId);
      const peerId = this.peerIdOf(conversation, userId);
      const [peer, flags] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: peerId }, select: peerSelect }),
        this.blockFlags(userId, peerId),
      ]);
      const has_active_match = Boolean(conversation.match_id);
      return {
        conversation_id: conversation.id,
        match_id: conversation.match_id,
        has_active_match,
        peer,
        i_blocked: flags.i_blocked,
        blocked_me: flags.blocked_me,
        can_send: this.canSend(has_active_match, flags.i_blocked, flags.blocked_me),
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
      };
    } catch (err) {
      throw err;
    }
  }

  async listMessages(userId: string, conversationId: string, query: ListMessagesQuery) {
    try {
      await this.assertParticipant(conversationId, userId);

      const limit = Math.min(
        Math.max(1, Number(query.limit) || MESSAGES_PAGE_SIZE),
        MESSAGES_PAGE_SIZE_MAX,
      );

      let cursorFilter: Prisma.MessageWhereInput = {};
      if (query.cursor) {
        const cursorMessage = await this.prisma.message.findFirst({
          where: { id: query.cursor, conversation_id: conversationId },
        });
        if (!cursorMessage) throw badRequest('invalid cursor');
        cursorFilter = {
          OR: [
            { created_at: { lt: cursorMessage.created_at } },
            {
              created_at: cursorMessage.created_at,
              id: { lt: cursorMessage.id },
            },
          ],
        };
      }

      const rows = await this.prisma.message.findMany({
        where: {
          conversation_id: conversationId,
          ...cursorFilter,
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        include: {
          likes: {
            select: { user_id: true },
          },
        },
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const messages: MessageRow[] = page
        .map((row) => ({
          id: row.id,
          conversation_id: row.conversation_id,
          sender_id: row.sender_id,
          content: row.content,
          message_type: row.message_type,
          media_url: row.media_url,
          is_read: row.is_read,
          created_at: row.created_at,
          liked_by_me: row.likes.some((like) => like.user_id === userId),
          like_count: row.likes.length,
        }))
        .reverse();

      await this.markRead(userId, conversationId);

      return {
        messages,
        next_cursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
        has_more: hasMore,
      };
    } catch (err) {
      throw err;
    }
  }

  async markRead(userId: string, conversationId: string) {
    try {
      const conversation = await this.assertParticipant(conversationId, userId);
      const result = await this.prisma.message.updateMany({
        where: {
          conversation_id: conversationId,
          sender_id: { not: userId },
          is_read: false,
        },
        data: { is_read: true },
      });

      if (result.count > 0) {
        const peerId = this.peerIdOf(conversation, userId);
        this.notify(peerId, 'messages_read', {
          conversation_id: conversationId,
          reader_id: userId,
        });
      }

      return { marked: result.count };
    } catch (err) {
      throw err;
    }
  }

  async sendMessage(userId: string, conversationId: string, body: SendMessageBody) {
    try {
      const conversation = await this.assertParticipant(conversationId, userId);
      const peerId = this.peerIdOf(conversation, userId);
      const flags = await this.blockFlags(userId, peerId);
      const has_active_match = Boolean(conversation.match_id);

      if (!this.canSend(has_active_match, flags.i_blocked, flags.blocked_me)) {
        if (flags.i_blocked || flags.blocked_me) {
          throw forbidden('messaging blocked with this user');
        }
        throw forbidden('cannot send without an active match');
      }

      const typeRaw = String(body.message_type || 'text').toLowerCase();
      if (typeRaw !== 'text' && typeRaw !== 'voice') {
        throw badRequest("message_type must be 'text' or 'voice'");
      }
      const messageType = typeRaw === 'voice' ? MessageType.VOICE : MessageType.TEXT;
      const content = String(body.content ?? '').trim();
      const mediaUrl = body.media_url ? String(body.media_url).trim() : null;

      if (messageType === MessageType.TEXT && !content) {
        throw badRequest('content is required for text messages');
      }
      if (messageType === MessageType.VOICE && !mediaUrl) {
        throw badRequest('media_url is required for voice messages');
      }
      if (mediaUrl) {
        await this.assertOwnedUnusedAudio(userId, mediaUrl);
      }

      const { unlimited, limit } = await this.quota.resolveMessageQuota(userId);

      const message = await this.prisma.$transaction(
        async (tx) => {
          if (!unlimited) {
            const { start, end } = utcDayBounds();
            const used = await tx.message.count({
              where: {
                sender_id: userId,
                created_at: { gte: start, lt: end },
              },
            });
            if (used >= (limit ?? 0)) {
              throw tooManyRequests('daily message limit reached', 'message_quota_exceeded');
            }
          }

          const created = await tx.message.create({
            data: {
              conversation_id: conversationId,
              sender_id: userId,
              content: messageType === MessageType.VOICE ? content || '' : content,
              message_type: messageType,
              media_url: mediaUrl,
            },
          });

          await tx.conversation.update({
            where: { id: conversationId },
            data: { updated_at: new Date() },
          });

          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      const payload = {
        id: message.id,
        conversation_id: conversationId,
        sender_id: userId,
        content: message.content,
        message_type: message.message_type,
        media_url: message.media_url,
        is_read: false,
        created_at: message.created_at,
        liked_by_me: false,
        like_count: 0,
      };

      this.notify(peerId, 'new_message', payload);
      this.notify(userId, 'new_message', payload);
      this.notify(peerId, 'notification_message', {
        event_type: 'message',
        conversation_id: conversationId,
        sender_id: userId,
        preview: messageType === MessageType.VOICE ? 'Voice message' : content.slice(0, 120),
      });

      const quota = await this.quota.buildQuotaSnapshot(userId);
      return { message: payload, quota };
    } catch (err) {
      throw err;
    }
  }

  /** Voice URLs must be caller-owned (`{userId}_{uuid}.ext`) and unused by any message. */
  private async assertOwnedUnusedAudio(userId: string, mediaUrl: string): Promise<void> {
    try {
      const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(
        `^/uploads/audio/${escapedUserId}_([0-9a-f-]{36}\\.[a-z0-9]+)$`,
        'i',
      );
      if (!pattern.test(mediaUrl)) {
        throw badRequest('invalid media_url', 'invalid_media_url');
      }

      const filename = mediaUrl.slice('/uploads/audio/'.length);
      const filePath = join(AUDIO_DIR, filename);
      if (!existsSync(filePath)) {
        throw badRequest('audio file not found', 'audio_not_found');
      }

      const existing = await this.prisma.message.findFirst({
        where: { media_url: mediaUrl },
        select: { id: true },
      });
      if (existing) {
        throw badRequest('audio already used', 'audio_already_used');
      }
    } catch (err) {
      throw err;
    }
  }

  async toggleLike(userId: string, conversationId: string, messageId: string) {
    try {
      await this.assertParticipant(conversationId, userId);
      const message = await this.prisma.message.findFirst({
        where: { id: messageId, conversation_id: conversationId },
      });
      if (!message) throw notFound('message not found');

      const existing = await this.prisma.messageLike.findUnique({
        where: {
          message_id_user_id: { message_id: messageId, user_id: userId },
        },
      });

      let liked: boolean;
      if (existing) {
        await this.prisma.messageLike.delete({ where: { id: existing.id } });
        liked = false;
      } else {
        await this.prisma.messageLike.create({
          data: { message_id: messageId, user_id: userId },
        });
        liked = true;
      }

      const like_count = await this.prisma.messageLike.count({ where: { message_id: messageId } });
      const conversation = await this.prisma.conversation.findUniqueOrThrow({
        where: { id: conversationId },
      });
      const peerId = this.peerIdOf(conversation, userId);

      const payload = {
        conversation_id: conversationId,
        message_id: messageId,
        user_id: userId,
        liked,
        like_count,
      };
      this.notify(userId, 'message_like_changed', payload);
      this.notify(peerId, 'message_like_changed', payload);

      return payload;
    } catch (err) {
      throw err;
    }
  }

  async setTyping(userId: string, conversationId: string, isTyping: boolean) {
    try {
      const conversation = await this.assertParticipant(conversationId, userId);
      if (!conversation.match_id) return { ok: true };

      const peerId = this.peerIdOf(conversation, userId);
      const flags = await this.blockFlags(userId, peerId);
      if (flags.i_blocked || flags.blocked_me) return { ok: true };

      this.notify(peerId, isTyping ? 'user_typing' : 'user_stop_typing', {
        conversation_id: conversationId,
        user_id: userId,
      });
      return { ok: true };
    } catch (err) {
      throw err;
    }
  }

  async uploadAudio(userId: string, file: UploadedFile): Promise<{ url: string }> {
    try {
      if (file.buffer.byteLength > VOICE_AUDIO_MAX_BYTES) {
        throw badRequest('audio exceeds the 10MB limit', 'audio_too_large');
      }

      const validation = validateUploadedFile({
        buffer: file.buffer,
        originalname: file.filename,
        mimetype: file.mimetype,
        allowedMimes: ALLOWED_VOICE_AUDIO_MIMES,
      });
      if (!validation.ok) {
        throw badRequest(validation.error, validation.error);
      }

      // Prefix with uploader id so sendMessage can prove ownership without a side table.
      const ext = validation.ext.startsWith('.') ? validation.ext : `.${validation.ext}`;
      const filename = `${userId}_${randomUUID()}${ext}`;
      await mkdir(AUDIO_DIR, { recursive: true });
      await writeFile(join(AUDIO_DIR, filename), file.buffer);
      return { url: `/uploads/audio/${filename}` };
    } catch (err) {
      throw err;
    }
  }

  async canAccessAudio(userId: string, filename: string): Promise<boolean> {
    try {
      const mediaUrl = `/uploads/audio/${filename}`;
      const message = await this.prisma.message.findFirst({
        where: { media_url: mediaUrl },
        select: {
          conversation: {
            select: { user_low_id: true, user_high_id: true },
          },
        },
      });
      if (!message) return false;
      const { user_low_id, user_high_id } = message.conversation;
      return user_low_id === userId || user_high_id === userId;
    } catch (err) {
      throw err;
    }
  }

  async getQuota(userId: string): Promise<MessageQuota> {
    try {
      return this.quota.buildQuotaSnapshot(userId);
    } catch (err) {
      throw err;
    }
  }
}
