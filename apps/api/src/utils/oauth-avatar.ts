import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';

import { ALLOWED_PROFILE_PHOTO_MIMES, PROFILE_PHOTO_MAX_BYTES } from '../constants.js';
import { PHOTOS_DIR, isStoredMediaPath, saveMediaFile } from './media-storage.js';
import { validateUploadedFile } from './media-validation.js';

/**
 * Downloads a remote avatar image (e.g. from Google or LinkedIn OAuth),
 * validates its contents and size, and persists it to PHOTOS_DIR.
 * Returns the stored path `/uploads/photos/<filename>` on success, or null on failure.
 */
export async function downloadAndSaveOAuthAvatar(imageUrl?: string | null): Promise<string | null> {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  // Already a local stored path
  if (
    isStoredMediaPath(imageUrl as string | null | undefined, 'photos') ||
    imageUrl.startsWith('/uploads/photos/')
  ) {
    return imageUrl;
  }

  // Only download valid http/https URLs
  const url = imageUrl as string;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Matchy/1.0)',
        Accept: 'image/jpeg,image/png,image/webp,image/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength === 0 || buffer.byteLength > PROFILE_PHOTO_MAX_BYTES) {
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const validation = validateUploadedFile({
      buffer,
      originalname: 'avatar.jpg',
      mimetype: contentType,
      allowedMimes: ALLOWED_PROFILE_PHOTO_MIMES,
    });

    if (!validation.ok) {
      return null;
    }

    await mkdir(PHOTOS_DIR, { recursive: true });
    const savedFilename = await saveMediaFile(PHOTOS_DIR, buffer, validation.ext);
    return `/uploads/photos/${savedFilename}`;
  } catch {
    return null;
  }
}
