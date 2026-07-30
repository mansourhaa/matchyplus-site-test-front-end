import { api } from '@/lib/api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuthenticatedMediaUrl } from './use-authenticated-media-url';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}));

const uuid = '1f3e4151-7f9c-4d7b-a780-c41ef4207feb';

describe('useAuthenticatedMediaUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it('uses a direct authenticated URL for video streams so the browser can send Range requests', () => {
    const { result } = renderHook(() =>
      useAuthenticatedMediaUrl(`/uploads/videos/${uuid}.mp4`, { stream: true }),
    );

    expect(result.current.url).toContain(`/profiles/media/videos/${uuid}.mp4`);
    expect(result.current.loading).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('revokes the object URL used for a protected photo when it unmounts', async () => {
    const createObjectURL = vi.fn(() => 'blob:profile-photo');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    vi.mocked(api.get).mockResolvedValue({ data: new Blob(['photo']) });

    const { result, unmount } = renderHook(() =>
      useAuthenticatedMediaUrl(`/uploads/photos/${uuid}.jpg`),
    );

    await waitFor(() => expect(result.current.url).toBe('blob:profile-photo'));
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    act(() => unmount());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:profile-photo');
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });
});
