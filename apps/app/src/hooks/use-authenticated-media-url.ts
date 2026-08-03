'use client';

import { api } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import { useEffect, useState } from 'react';

type AuthenticatedMediaState = {
  source: string | null;
  url: string | null;
  error: string | null;
};

type AuthenticatedMediaResult = {
  url: string | null;
  loading: boolean;
  error: string | null;
};

/**
 * Photos are fetched through the cookie-aware API client (which can also refresh the
 * HttpOnly session), then exposed as a short-lived object URL. Videos may opt into a
 * direct cookie-authenticated URL so the browser can issue native Range requests.
 */
export function useAuthenticatedMediaUrl(
  storedValue: string | null | undefined,
  options: { stream?: boolean } = {},
): AuthenticatedMediaResult {
  const [state, setState] = useState<AuthenticatedMediaState>({
    source: null,
    url: null,
    error: null,
  });
  const resolved = resolveMediaUrl(storedValue);
  const isProtected = Boolean(
    storedValue?.match(/^\/uploads\/(photos|videos|audio)\/[0-9a-f-]{36}\.[a-z0-9]+$/i),
  );
  const streamDirectly = Boolean(options.stream && storedValue?.startsWith('/uploads/videos/'));

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    if (!resolved || !isProtected || streamDirectly) return;
    void api
      .get<Blob>(resolved, { responseType: 'blob' })
      .then((response) => {
        if (cancelled) return;
        objectUrl =
          typeof URL.createObjectURL === 'function' ? URL.createObjectURL(response.data) : resolved;
        setState({ source: storedValue ?? null, url: objectUrl, error: null });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ source: storedValue ?? null, url: null, error: 'media_unavailable' });
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl?.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isProtected, resolved, storedValue, streamDirectly]);

  if (!resolved) return { url: null, loading: false, error: null };
  if (!isProtected || streamDirectly) return { url: resolved, loading: false, error: null };
  if (state.source !== storedValue) return { url: null, loading: true, error: null };
  return { url: state.url, loading: false, error: state.error };
}
