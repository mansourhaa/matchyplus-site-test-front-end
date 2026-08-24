'use client';

import { adminApi } from '@/lib/admin-api';
import { useEffect, useState } from 'react';

const STORED_VIDEO_PATH = /^\/uploads\/videos\/[0-9a-f-]{36}\.[a-z0-9]+$/i;

export function useAdminUserVideo(
  userId: string | null | undefined,
  video: string | null | undefined,
): string | null {
  const isStoredVideo = Boolean(video && STORED_VIDEO_PATH.test(video));
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isStoredVideo || !userId) return;

    let cancelled = false;
    let url: string | null = null;

    void adminApi
      .get<Blob>(`/admin/users/${userId}/video`, { responseType: 'blob' })
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
  }, [userId, isStoredVideo]);

  if (!isStoredVideo) return null;
  return objectUrl;
}
