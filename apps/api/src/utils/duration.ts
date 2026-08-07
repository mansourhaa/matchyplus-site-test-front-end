/**
 * Parse ACCESS_TOKEN_TTL-style values into whole seconds.
 * Accepts plain integers (`3600`) and duration strings (`1h`, `15m`, `7d`, `30s`).
 */
export function parseDurationSeconds(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('duration must be a non-empty string');
  }

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      throw new Error(`invalid duration: "${value}"`);
    }
    return seconds;
  }

  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i.exec(trimmed);
  if (!match) {
    throw new Error(`invalid duration: "${value}"`);
  }

  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`invalid duration: "${value}"`);
  }

  const multipliers: Record<string, number> = {
    ms: 1 / 1000,
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  const seconds = Math.floor(amount * multipliers[unit]!);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`invalid duration: "${value}"`);
  }
  return seconds;
}
