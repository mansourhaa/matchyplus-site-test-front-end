// `User.image`/`User.video` store either a legacy base64 data URL (written directly by
// the onboarding wizard) or a served path from the real upload pipeline
// (`/uploads/photos|videos/<filename>`) — the latter isn't a static file, it's only
// reachable through the authenticated streaming routes in apps/api/src/routes/v1/profiles.
// Voice notes use `/uploads/audio/<filename>` via conversations audio routes.
export function resolveMediaUrl(storedPath: string | null | undefined): string | null {
  if (!storedPath) return null;
  if (storedPath.startsWith('data:')) return storedPath;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  const photoMatch = storedPath.match(/^\/uploads\/photos\/([0-9a-f-]{36}\.[a-z0-9]+)$/i);
  if (photoMatch) return `${apiUrl}/profiles/media/photos/${photoMatch[1]}`;

  const videoMatch = storedPath.match(/^\/uploads\/videos\/([0-9a-f-]{36}\.[a-z0-9]+)$/i);
  if (videoMatch) return `${apiUrl}/profiles/media/videos/${videoMatch[1]}`;

  const audioMatch = storedPath.match(/^\/uploads\/audio\/([0-9a-f-]{36}\.[a-z0-9]+)$/i);
  if (audioMatch) return `${apiUrl}/conversations/audio/${audioMatch[1]}`;

  return storedPath;
}
