import { describe, expect, it, vi } from 'vitest';

import { postToVoiceAi, voiceAiCandidateUrls } from './voice-ai-http.js';

/** A fetch that never answers until its signal is aborted (a stalled address). */
function stalled(_url: string, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  });
}

describe('voice-ai http', () => {
  it('adds the localhost twin of host.docker.internal', () => {
    expect(voiceAiCandidateUrls('http://host.docker.internal:8001/')).toEqual([
      'http://host.docker.internal:8001',
      'http://localhost:8001',
    ]);
    expect(voiceAiCandidateUrls('http://voice-ai:8001')).toEqual(['http://voice-ai:8001']);
  });

  it('does not wait for a stalled host.docker.internal when localhost answers', async () => {
    const fetchImpl = vi.fn((url: string, init?: RequestInit) =>
      url.includes('host.docker.internal')
        ? stalled(url, init)
        : Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
    const started = Date.now();

    const reply = await postToVoiceAi(
      'http://host.docker.internal:8001',
      '/relabel',
      '{}',
      5000,
      fetchImpl as never,
    );

    expect(reply).toEqual({ status: 200, ok: true, json: { ok: true } });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('gives up after one timeout for all the addresses together', async () => {
    const started = Date.now();

    const reply = await postToVoiceAi(
      'http://host.docker.internal:8001',
      '/relabel',
      '{}',
      200,
      stalled as never,
    );

    expect(reply).toBeNull();
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('reports a non-JSON answer', async () => {
    const reply = await postToVoiceAi(
      'http://voice-ai:8001',
      '/relabel',
      '{}',
      1000,
      (async () => new Response('<html>Bad Gateway</html>', { status: 502 })) as never,
    );

    expect(reply).toEqual({ status: 502, ok: false, json: undefined });
  });
});
