import { describe, expect, it, vi } from 'vitest';

import { VoiceRelabelService } from './voice-relabel.js';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('VoiceRelabelService', () => {
  it('forwards the values to /relabel and keeps only the known fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        fields: {
          profession: { value: 'Aide ménagère', review: false, original: 'معينة منزلية' },
          city: { value: 'Sousse', review: false },
          bio: { value: null, review: true },
          unknown_field: { value: 'x' },
        },
        suggestions: { first_name: [{ value: 'Hala', label: 'Hala' }] },
        serviceId: 'menage.aide_menagere',
      }),
    );
    const service = new VoiceRelabelService('http://voice-ai:8001/', fetchMock);

    const result = await service.relabel({
      values: { profession: 'معينة منزلية', city: 'سوسة' },
      uiLocale: 'fr',
      serviceId: 'menage.aide_menagere',
      aiFields: ['profession', 'city'],
      suggestions: { first_name: [{ value: 'هالة', label: 'هالة' }] },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://voice-ai:8001/relabel');
    expect(JSON.parse(init.body)).toEqual({
      values: { profession: 'معينة منزلية', city: 'سوسة' },
      uiLocale: 'fr',
      serviceId: 'menage.aide_menagere',
      aiFields: ['profession', 'city'],
      suggestions: { first_name: [{ value: 'هالة', label: 'هالة' }] },
    });
    expect(result).toEqual({
      fields: {
        profession: { value: 'Aide ménagère', review: false },
        city: { value: 'Sousse', review: false },
        bio: { value: null, review: true },
      },
      suggestions: { first_name: [{ value: 'Hala', label: 'Hala' }] },
      serviceId: 'menage.aide_menagere',
    });
  });

  it('reports 503 when the voice service is down or answers an error', async () => {
    const down = new VoiceRelabelService(
      'http://voice-ai:8001',
      vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    );
    await expect(down.relabel({ values: {}, uiLocale: 'ar' })).rejects.toMatchObject({
      statusCode: 503,
    });

    const failing = new VoiceRelabelService(
      'http://voice-ai:8001',
      vi.fn().mockResolvedValue(jsonResponse({ detail: 'boom' }, 500)),
    );
    await expect(failing.relabel({ values: {}, uiLocale: 'ar' })).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});
