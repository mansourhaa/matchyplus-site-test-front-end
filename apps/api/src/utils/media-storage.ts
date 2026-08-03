import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Two levels up from src/utils (or dist/utils in production) lands at apps/api/uploads —
// gitignored, local-disk storage per the current infra (no object-storage account
// provisioned yet; swap this module's implementation for an S3/Cloudinary client later
// without touching callers).
const UPLOAD_ROOT = join(__dirname, '..', '..', 'uploads');
export const PHOTOS_DIR = join(UPLOAD_ROOT, 'photos');
export const VIDEOS_DIR = join(UPLOAD_ROOT, 'videos');
export const AUDIO_DIR = join(UPLOAD_ROOT, 'audio');

export async function ensureUploadDirs(): Promise<void> {
  await mkdir(PHOTOS_DIR, { recursive: true });
  await mkdir(VIDEOS_DIR, { recursive: true });
  await mkdir(AUDIO_DIR, { recursive: true });
}

/** Writes a validated buffer under `dir` with a fresh UUID filename; returns that filename. */
export async function saveMediaFile(dir: string, buffer: Buffer, ext: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}${ext.startsWith('.') ? ext : `.${ext}`}`;
  await writeFile(join(dir, filename), buffer);
  return filename;
}

/** Best-effort delete — a file that's already gone (or never existed) is not an error. */
export async function deleteMediaFile(dir: string, filename: string): Promise<void> {
  try {
    await unlink(join(dir, filename));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

/**
 * `User.image` may hold either a legacy base64 data URL (still written directly by the
 * onboarding wizard's PATCH /users/me/profile) or a served path from the real upload
 * pipeline below (`/uploads/photos/<uuid>.ext`) — this tells the two apart so callers
 * never try to unlink a data URL as if it were a filename on disk.
 */
const STORED_MEDIA_PATH = /^\/uploads\/(photos|videos|audio)\/([0-9a-f-]{36}\.[a-z0-9]+)$/i;

export function isStoredMediaPath(
  value: string | null | undefined,
  kind?: 'photos' | 'videos' | 'audio',
): value is string {
  if (!value) return false;
  const match = value.match(STORED_MEDIA_PATH);
  return Boolean(match && (!kind || match[1] === kind));
}

/** Extracts the on-disk filename from a stored `/uploads/<kind>/<filename>` path. */
export function filenameFromStoredPath(storedPath: string): string {
  const match = storedPath.match(STORED_MEDIA_PATH);
  if (!match?.[2]) {
    throw new Error('invalid_stored_media_path');
  }
  return match[2];
}
