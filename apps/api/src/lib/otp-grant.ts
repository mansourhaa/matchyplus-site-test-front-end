import { createHash, randomBytes } from 'node:crypto';

// 256 bits of entropy, same rationale as lib/oauth-exchange-code.ts — this token
// proves a completed signup-verification OTP check without itself being a session,
// so it must be infeasible to guess or brute-force.
export function generateOtpGrant(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOtpGrant(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
