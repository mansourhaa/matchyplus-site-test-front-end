import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PHOTOS_DIR, filenameFromStoredPath } from './media-storage.js';
import { downloadAndSaveOAuthAvatar } from './oauth-avatar.js';

// Minimal 1x1 valid PNG binary
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('downloadAndSaveOAuthAvatar', () => {
  const createdFiles: string[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    for (const file of createdFiles) {
      try {
        await rm(join(PHOTOS_DIR, file), { force: true });
      } catch {
        // ignore cleanup error
      }
    }
    createdFiles.length = 0;
  });

  it('returns null for null, undefined, or empty URLs', async () => {
    expect(await downloadAndSaveOAuthAvatar(null)).toBeNull();
    expect(await downloadAndSaveOAuthAvatar(undefined)).toBeNull();
    expect(await downloadAndSaveOAuthAvatar('')).toBeNull();
    expect(await downloadAndSaveOAuthAvatar('invalid-url')).toBeNull();
  });

  it('returns existing stored media paths directly without re-downloading', async () => {
    const existing = '/uploads/photos/12345678-1234-1234-1234-123456789abc.jpg';
    const result = await downloadAndSaveOAuthAvatar(existing);
    expect(result).toBe(existing);
  });

  it('downloads image, validates format, and saves to PHOTOS_DIR', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (h: string) => (h.toLowerCase() === 'content-type' ? 'image/png' : null),
      },
      arrayBuffer: async () =>
        PNG_1X1.buffer.slice(PNG_1X1.byteOffset, PNG_1X1.byteOffset + PNG_1X1.byteLength),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await downloadAndSaveOAuthAvatar(
      'https://lh3.googleusercontent.com/a/test-avatar',
    );
    expect(result).toMatch(/^\/uploads\/photos\/[0-9a-f-]{36}\.png$/i);

    if (result) {
      createdFiles.push(filenameFromStoredPath(result));
    }
  });

  it('returns null when HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const result = await downloadAndSaveOAuthAvatar('https://lh3.googleusercontent.com/a/missing');
    expect(result).toBeNull();
  });

  it('returns null when image file signature is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: () => 'text/html',
        },
        arrayBuffer: async () => Buffer.from('<html>not an image</html>').buffer,
      }),
    );
    const result = await downloadAndSaveOAuthAvatar('https://example.com/not-an-image');
    expect(result).toBeNull();
  });
});
