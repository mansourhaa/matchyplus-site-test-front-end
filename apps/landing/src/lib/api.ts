const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

const envApiBaseUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
const envDisableApi = process.env.NEXT_PUBLIC_DISABLE_API || 'false';

export const API_DISABLED = /^(1|true|yes|on)$/i.test(envDisableApi);
export const API_BASE_URL = envApiBaseUrl.replace(/\/+$/, '');

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  if (API_DISABLED) {
    return {
      success: false,
      error: 'Mock API mode is enabled but no mock handlers are configured.',
    };
  }

  let appLang = 'fr';
  try {
    const saved = localStorage.getItem('matchy_lang');
    if (saved && ['fr', 'en', 'ar'].includes(saved)) appLang = saved;
  } catch {
    // ignore
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept-Language': appLang,
    ...(options.headers ?? {}),
  };

  try {
    const res = await fetch(buildApiUrl(path), {
      ...options,
      credentials: 'include',
      headers,
    });

    const contentType = res.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json') ? await res.json() : {};

    if (!res.ok) {
      const rawError = body?.error ?? body?.message ?? `Erreur ${res.status}`;
      return { success: false, error: String(rawError) };
    }

    return { success: true, data: body as T, message: body?.message };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur réseau';
    return { success: false, error: `Impossible de joindre le serveur : ${message}` };
  }
}
