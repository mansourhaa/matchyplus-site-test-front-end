import { badRequest } from './http-errors.js';

/** Rejects any filename that isn't a bare name — no path traversal or separators. */
export function assertSafeFilename(filename: string): void {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw badRequest('invalid filename', 'invalid_filename');
  }
}

export function extensionOf(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
}

/** Parses an HTTP `Range: bytes=start-end` header against a known file size. */
export function parseRange(
  value: string | undefined,
  size: number,
): { start: number; end: number } | null {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) throw badRequest('invalid range', 'invalid_range');

  const requestedStart = match[1] ? Number(match[1]) : null;
  const requestedEnd = match[2] ? Number(match[2]) : null;
  let start = requestedStart ?? Math.max(size - (requestedEnd ?? 0), 0);
  let end = requestedStart === null ? size - 1 : (requestedEnd ?? size - 1);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    throw badRequest('invalid range', 'invalid_range');
  }
  start = Math.min(start, size - 1);
  end = Math.min(end, size - 1);
  return { start, end };
}
