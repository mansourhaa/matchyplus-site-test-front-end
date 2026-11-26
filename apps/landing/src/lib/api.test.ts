import { afterEach, describe, expect, it, vi } from 'vitest';

import { postToApi } from './api';
import { API_URL } from './constants';

describe('postToApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts JSON to the API and is true only on a 2xx answer', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"success":true}', { status: 200 }));

    await expect(postToApi('/contact', { name: 'Ali' })).resolves.toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(`${API_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Ali"}',
    });
  });

  it('is false when the API answers an error or cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 429 }));
    await expect(postToApi('/contact', {})).resolves.toBe(false);

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'));
    await expect(postToApi('/contact', {})).resolves.toBe(false);
  });
});
