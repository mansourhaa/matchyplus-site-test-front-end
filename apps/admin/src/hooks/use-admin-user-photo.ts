'use client';

import { adminApi } from '@/lib/admin-api';
import { useEffect, useState } from 'react';

const STORED_PHOTO_PATH = /^\/uploads\/photos\/[0-9a-f-]{36}\.[a-z0-9]+$/i;

const inFlightRequests = new Map<string, Promise<Blob>>();
const photoBlobCache = new Map<string, Blob>();

export function clearPhotoCache(): void {
  photoBlobCache.clear();
  inFlightRequests.clear();
}

export function useAdminUserPhoto(
  userId: string | null | undefined,
  image: string | null | undefined,
): string | null {
  const isStoredPhoto = Boolean(image && STORED_PHOTO_PATH.test(image));
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isStoredPhoto || !userId) return;

    let cancelled = false;
    let url: string | null = null;
    const cacheKey = `${userId}:${image}`;

    const resolveBlob = async (): Promise<Blob> => {
      const cached = photoBlobCache.get(cacheKey);
      if (cached) return cached;

      const existingRequest = inFlightRequests.get(cacheKey);
      if (existingRequest) return existingRequest;

      const request = adminApi
        .get<Blob>(`/admin/users/${userId}/photo`, { responseType: 'blob' })
        .then((response) => {
          photoBlobCache.set(cacheKey, response.data);
          inFlightRequests.delete(cacheKey);
          return response.data;
        })
        .catch((err) => {
          inFlightRequests.delete(cacheKey);
          throw err;
        });

      inFlightRequests.set(cacheKey, request);
      return request;
    };

    void resolveBlob()
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(null);
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [userId, image, isStoredPhoto]);

  if (!image) return null;
  if (!isStoredPhoto) return image;
  return objectUrl;
}
