import { describe, expect, it } from 'vitest';

import { shouldAbortMicAcquire, syncConversationBinding } from './mic-conversation-binding';

describe('shouldAbortMicAcquire', () => {
  it('aborts when conversation changed during in-flight acquire', () => {
    expect(shouldAbortMicAcquire(0, 0, 0, 0, 'conv-a', 'conv-b')).toBe(true);
  });

  it('aborts when acquire epoch bumped during await', () => {
    expect(shouldAbortMicAcquire(0, 1, 0, 0, 'conv-a', 'conv-a')).toBe(true);
  });

  it('allows acquire when binding unchanged', () => {
    expect(shouldAbortMicAcquire(0, 0, 0, 0, 'conv-a', 'conv-a')).toBe(false);
  });
});

describe('syncConversationBinding', () => {
  it('bumps acquire epoch when conversation changes during in-flight acquire', () => {
    const conversationIdRef = { current: 'conv-a' };
    const acquireInFlightRef = { current: true };
    const acquireEpochRef = { current: 0 };

    syncConversationBinding({ conversationIdRef, acquireInFlightRef, acquireEpochRef }, 'conv-b');

    expect(conversationIdRef.current).toBe('conv-b');
    expect(acquireEpochRef.current).toBe(1);
  });

  it('does not bump epoch when conversation unchanged', () => {
    const conversationIdRef = { current: 'conv-a' };
    const acquireInFlightRef = { current: true };
    const acquireEpochRef = { current: 0 };

    syncConversationBinding({ conversationIdRef, acquireInFlightRef, acquireEpochRef }, 'conv-a');

    expect(acquireEpochRef.current).toBe(0);
  });
});
