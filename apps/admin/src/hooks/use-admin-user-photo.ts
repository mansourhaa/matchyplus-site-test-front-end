'use client';

import { adminApi } from '@/lib/admin-api';
import { useEffect, useState } from 'react';

const STORED_PHOTO_PATH = /^\/uploads\/photos\/[0-9a-f-]{36}\.[a-z0-9]+$/i;

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

    void adminApi
      .get<Blob>(`/admin/users/${userId}/photo`, { responseType: 'blob' })
      .then((response) => {
        if (cancelled) return;
        url = URL.createObjectURL(response.data);
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(null);
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [userId, isStoredPhoto]);

  if (!image) return null;
  if (!isStoredPhoto) return image;
  return objectUrl;
}
