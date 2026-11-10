import crypto from 'crypto';

export const ACTIVATION_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function generateActivationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashActivationToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export function computeActivationExpiry(ttlMs: number = ACTIVATION_TOKEN_TTL_MS): Date {
  return new Date(Date.now() + ttlMs);
}

export function getFrontendBaseUrl(): string {
  const candidates = [process.env.APP_URL, process.env.FRONTEND_URL, process.env.PUBLIC_APP_URL];
  for (const candidate of candidates) {
    const value = String(candidate || '')
      .trim()
      .replace(/\/+$/, '');
    if (value) return value;
  }
  return 'http://localhost:3000';
}

export function buildActivationLink(token: string): string {
  const base = getFrontendBaseUrl();
  return `${base}/activer?token=${encodeURIComponent(token)}`;
}
