import { createHash, randomBytes } from 'node:crypto';

// 256 bits of entropy — brute-forcing a stolen hash is infeasible without a secret
// pepper, unlike the low-entropy numeric verification codes elsewhere in this codebase.
export function generateExchangeCode(): string {
  return randomBytes(32).toString('base64url');
}

export function hashExchangeCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
