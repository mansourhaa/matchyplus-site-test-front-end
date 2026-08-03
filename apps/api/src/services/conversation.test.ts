import { describe, expect, it, vi } from 'vitest';

import { MessageType, UserPlan } from '@saas-boilerplate/types';

import { ConversationService } from './conversation.js';

function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    userBlock: {
      findFirst: vi.fn(),
    },
    conversation: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    messageLike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

describe('ConversationService', () => {
  it('ensureForMatch creates a conversation for a new pair', async () => {
    const prisma = createMockPrisma();
    const created = {
      id: 'conv-1',
      match_id: 'match-1',
      user_low_id: 'u1',
      user_high_id: 'u2',
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );
    prisma.conversation.findUnique.mockResolvedValue(null);
    prisma.conversation.create.mockResolvedValue(created);

    const service = new ConversationService({ prisma: prisma as never });
    const result = await service.ensureForMatch('match-1', 'u2', 'u1');

    expect(result).toEqual({ id: 'conv-1' });
    expect(prisma.conversation.create).toHaveBeenCalledWith({
      data: {
        match_id: 'match-1',
        user_low_id: 'u1',
        user_high_id: 'u2',
      },
    });
  });

  it('ensureForMatch reattaches match_id on rematch', async () => {
    const prisma = createMockPrisma();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      match_id: null,
      user_low_id: 'u1',
      user_high_id: 'u2',
    });
    prisma.conversation.update.mockResolvedValue({
      id: 'conv-1',
      match_id: 'match-2',
      user_low_id: 'u1',
      user_high_id: 'u2',
    });

    const service = new ConversationService({ prisma: prisma as never });
    const result = await service.ensureForMatch('match-2', 'u1', 'u2');

    expect(result).toEqual({ id: 'conv-1' });
    expect(prisma.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      data: { match_id: 'match-2' },
    });
  });

  it('detachOnUnmatch nulls match_id and notifies both users', async () => {
    const prisma = createMockPrisma();
    const notify = vi.fn();
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      match_id: 'match-1',
      user_low_id: 'u1',
      user_high_id: 'u2',
    });
    prisma.conversation.update.mockResolvedValue({ id: 'conv-1', match_id: null });

    const service = new ConversationService({ prisma: prisma as never, notify });
    const result = await service.detachOnUnmatch('u1', 'u2');

    expect(result).toEqual({ conversation_id: 'conv-1' });
    expect(prisma.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      data: { match_id: null },
    });
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith(
      'u1',
      'conversation_status_changed',
      expect.objectContaining({ conversation_id: 'conv-1', can_send: false }),
    );
  });

  it('rejects send without an active match', async () => {
    const prisma = createMockPrisma();
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      match_id: null,
      user_low_id: 'u1',
      user_high_id: 'u2',
    });
    prisma.userBlock.findFirst.mockResolvedValue(null);

    const service = new ConversationService({ prisma: prisma as never });
    await expect(
      service.sendMessage('u1', 'conv-1', { content: 'hi', message_type: 'text' }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('sends a text message and notifies both peers', async () => {
    const prisma = createMockPrisma();
    const notify = vi.fn();
    const createdAt = new Date('2026-08-03T10:00:00.000Z');

    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      match_id: 'match-1',
      user_low_id: 'u1',
      user_high_id: 'u2',
    });
    prisma.userBlock.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ plan: UserPlan.FREE });
    prisma.plan.findUnique.mockResolvedValue({ messages_per_day: -1 });
    prisma.message.create.mockResolvedValue({
      id: 'msg-1',
      conversation_id: 'conv-1',
      sender_id: 'u1',
      content: 'hello',
      message_type: MessageType.TEXT,
      media_url: null,
      is_read: false,
      created_at: createdAt,
    });
    prisma.conversation.update.mockResolvedValue({});

    const service = new ConversationService({ prisma: prisma as never, notify });
    const result = await service.sendMessage('u1', 'conv-1', {
      content: 'hello',
      message_type: 'text',
    });

    expect(result.message).toMatchObject({
      id: 'msg-1',
      content: 'hello',
      message_type: MessageType.TEXT,
    });
    expect(notify).toHaveBeenCalledWith('u2', 'new_message', expect.any(Object));
    expect(notify).toHaveBeenCalledWith('u1', 'new_message', expect.any(Object));
    expect(notify).toHaveBeenCalledWith('u2', 'notification_message', expect.any(Object));
  });

  it('enforces daily message quota', async () => {
    const prisma = createMockPrisma();
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      match_id: 'match-1',
      user_low_id: 'u1',
      user_high_id: 'u2',
    });
    prisma.userBlock.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ plan: UserPlan.FREE });
    prisma.plan.findUnique.mockResolvedValue({ messages_per_day: 2 });
    prisma.message.count.mockResolvedValue(2);

    const service = new ConversationService({ prisma: prisma as never });
    await expect(
      service.sendMessage('u1', 'conv-1', { content: 'hi', message_type: 'text' }),
    ).rejects.toMatchObject({ statusCode: 429, code: 'message_quota_exceeded' });
  });

  it('toggles message likes', async () => {
    const prisma = createMockPrisma();
    const notify = vi.fn();
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      match_id: 'match-1',
      user_low_id: 'u1',
      user_high_id: 'u2',
    });
    prisma.conversation.findUniqueOrThrow.mockResolvedValue({
      id: 'conv-1',
      user_low_id: 'u1',
      user_high_id: 'u2',
    });
    prisma.message.findFirst.mockResolvedValue({
      id: 'msg-1',
      conversation_id: 'conv-1',
    });
    prisma.messageLike.findUnique.mockResolvedValue(null);
    prisma.messageLike.create.mockResolvedValue({ id: 'like-1' });
    prisma.messageLike.count.mockResolvedValue(1);

    const service = new ConversationService({ prisma: prisma as never, notify });
    const result = await service.toggleLike('u1', 'conv-1', 'msg-1');

    expect(result).toMatchObject({ liked: true, like_count: 1, message_id: 'msg-1' });
    expect(notify).toHaveBeenCalledWith('u2', 'message_like_changed', expect.any(Object));
  });
});
