/**
 * Mic acquire can await getUserMedia across a conversation switch. The guard after
 * the await must see the current thread immediately — not after useEffect flush.
 */

export function shouldAbortMicAcquire(
  acquireEpochAtStart: number,
  acquireEpochNow: number,
  generationAtStart: number,
  generationNow: number,
  conversationIdAtStart: string,
  conversationIdNow: string,
): boolean {
  return (
    acquireEpochAtStart !== acquireEpochNow ||
    generationAtStart !== generationNow ||
    conversationIdNow !== conversationIdAtStart
  );
}

export function syncConversationBinding(
  refs: {
    conversationIdRef: { current: string };
    acquireInFlightRef: { current: boolean };
    acquireEpochRef: { current: number };
  },
  conversationId: string,
): void {
  if (refs.conversationIdRef.current !== conversationId) {
    refs.conversationIdRef.current = conversationId;
    if (refs.acquireInFlightRef.current) {
      refs.acquireEpochRef.current += 1;
    }
  }
}
