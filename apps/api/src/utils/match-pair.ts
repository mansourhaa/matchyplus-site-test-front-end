/** Lexicographic pair key so Match rows stay unique regardless of who liked first. */
export function orderedUserPair(a: string, b: string): { userLowId: string; userHighId: string } {
  return a < b ? { userLowId: a, userHighId: b } : { userLowId: b, userHighId: a };
}

export function otherUserId(pair: { userLowId: string; userHighId: string }, me: string): string {
  return pair.userLowId === me ? pair.userHighId : pair.userLowId;
}
