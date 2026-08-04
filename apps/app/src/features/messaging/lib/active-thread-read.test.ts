import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDebouncedMarkRead, shouldMarkActiveThreadRead } from './active-thread-read';

describe('shouldMarkActiveThreadRead', () => {
  it('marks read for a peer message on the open thread', () => {
    expect(
      shouldMarkActiveThreadRead({
        activeConversationId: 'conv-1',
        conversationId: 'conv-1',
        senderId: 'peer',
        viewerId: 'me',
      }),
    ).toBe(true);
  });

  it('does not mark read for the viewer’s own echo', () => {
    expect(
      shouldMarkActiveThreadRead({
        activeConversationId: 'conv-1',
        conversationId: 'conv-1',
        senderId: 'me',
        viewerId: 'me',
      }),
    ).toBe(false);
  });

  it('does not mark read for another conversation', () => {
    expect(
      shouldMarkActiveThreadRead({
        activeConversationId: 'conv-1',
        conversationId: 'conv-2',
        senderId: 'peer',
        viewerId: 'me',
      }),
    ).toBe(false);
  });
});

describe('createDebouncedMarkRead', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid schedules into one mark-read call', () => {
    vi.useFakeTimers();
    const markRead = vi.fn();
    const scheduler = createDebouncedMarkRead(markRead, 300);

    scheduler.schedule('conv-1');
    scheduler.schedule('conv-1');
    scheduler.schedule('conv-1');

    expect(markRead).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(markRead).toHaveBeenCalledTimes(1);
    expect(markRead).toHaveBeenCalledWith('conv-1');
  });

  it('cancelAll prevents a pending mark-read', () => {
    vi.useFakeTimers();
    const markRead = vi.fn();
    const scheduler = createDebouncedMarkRead(markRead, 300);

    scheduler.schedule('conv-1');
    scheduler.cancelAll();
    vi.advanceTimersByTime(300);

    expect(markRead).not.toHaveBeenCalled();
  });
});
