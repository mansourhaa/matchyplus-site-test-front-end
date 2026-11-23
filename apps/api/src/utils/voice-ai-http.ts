export const DEFAULT_VOICE_AI_URL = 'http://localhost:8001';

/**
 * `VOICE_AI_URL` is written for the AI worker, which runs in Docker and reaches the voice
 * service through host.docker.internal. The API may run on the host itself (`pnpm dev`),
 * where that name does not always resolve: then localhost is tried too.
 */
export function voiceAiCandidateUrls(baseUrl: string): string[] {
  const base = baseUrl.replace(/\/$/, '');
  const onHost = base.replace('://host.docker.internal', '://localhost');
  return onHost === base ? [base] : [base, onHost];
}

export type VoiceAiReply = {
  status: number;
  ok: boolean;
  /** Parsed body, or undefined when the service did not answer JSON. */
  json: unknown;
};

/**
 * POSTs `body` (JSON) to `path` on every candidate address at once: the first one that
 * answers wins and the others are cancelled. One timeout covers the whole call, body
 * included, so an address that stalls (host.docker.internal on some hosts) costs at most
 * `timeoutMs` instead of one timeout per address. Null when no address answered in time.
 */
export async function postToVoiceAi(
  baseUrl: string,
  path: string,
  body: string,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<VoiceAiReply | null> {
  const urls = voiceAiCandidateUrls(baseUrl);
  const controllers = urls.map(() => new AbortController());
  const timer = setTimeout(() => {
    for (const controller of controllers) controller.abort();
  }, timeoutMs);
  try {
    const { response, index } = await Promise.any(
      urls.map(async (base, index) => {
        const response = await fetchImpl(`${base}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          signal: controllers[index]?.signal,
        });
        return { response, index };
      }),
    );
    controllers.forEach((controller, other) => {
      if (other !== index) controller.abort();
    });
    const json = await response.json().catch(() => undefined);
    return { status: response.status, ok: response.ok, json };
  } catch {
    // Every address failed or the timeout fired.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
