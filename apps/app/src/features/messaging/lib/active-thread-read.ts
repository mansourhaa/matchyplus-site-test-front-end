/** Whether an incoming realtime message should trigger a server mark-read. */
export function shouldMarkActiveThreadRead(input: {
  activeConversationId: string | null;
  conversationId: string;
  senderId: string;
  viewerId?: string | null;
}): boolean {
  if (!input.activeConversationId) return false;
  if (input.activeConversationId !== input.conversationId) return false;
  if (!input.viewerId) return false;
  return input.senderId !== input.viewerId;
}

/**
 * Coalesce rapid peer messages on an open thread into one POST /read.
 * Call cancelAll on socket teardown.
 */
export function createDebouncedMarkRead(markRead: (conversationId: string) => void, delayMs = 300) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    schedule(conversationId: string) {
      const existing = timers.get(conversationId);
      if (existing) clearTimeout(existing);
      timers.set(
        conversationId,
        setTimeout(() => {
          timers.delete(conversationId);
          markRead(conversationId);
        }, delayMs),
      );
    },
    cancelAll() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    },
  };
}
