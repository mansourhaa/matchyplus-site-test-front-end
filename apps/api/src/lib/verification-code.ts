import { createHmac, randomInt } from 'node:crypto';

import { config } from '../config.js';

export function generateNumericCode(length = 6): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;

  return String(randomInt(min, max + 1));
}

export function hashVerificationCode(code: string): string {
  return createHmac('sha256', config.verificationCodeSecret).update(code).digest('hex');
}
