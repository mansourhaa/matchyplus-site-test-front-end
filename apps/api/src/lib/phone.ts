export function normalizePhoneForAuth(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const compact = raw.replace(/[\s\-()]/g, '');
  const maybeInternational = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
  const digits = maybeInternational.replace(/\D/g, '');
  if (!digits) return null;

  if (maybeInternational.startsWith('+')) return `+${digits}`;
  if (digits.length === 8) return `+216${digits}`;
  if (digits.startsWith('216') && digits.length === 11) return `+${digits}`;
  return `+${digits}`;
}
