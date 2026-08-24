import { adminApi } from '@/lib/admin-api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAdminUserVideo } from './use-admin-user-video';

vi.mock('@/lib/admin-api', () => ({
  adminApi: { get: vi.fn() },
}));

const uuid = '1f3e4151-7f9c-4d7b-a780-c41ef4207feb';

describe('useAdminUserVideo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it('returns null for a user with no video', () => {
    const { result } = renderHook(() => useAdminUserVideo('u1', null));

    expect(result.current).toBeNull();
    expect(adminApi.get).not.toHaveBeenCalled();
  });

  it('returns null for a value that is not a stored video path', () => {
    const { result } = renderHook(() =>
      useAdminUserVideo('u1', '/uploads/photos/1f3e4151-7f9c-4d7b-a780-c41ef4207feb.jpg'),
    );

    expect(result.current).toBeNull();
    expect(adminApi.get).not.toHaveBeenCalled();
  });

  it('fetches a stored video path through the admin-authenticated route and exposes an object URL', async () => {
    const createObjectURL = vi.fn(() => 'blob:admin-user-video');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    vi.mocked(adminApi.get).mockResolvedValue({ data: new Blob(['video']) });

    const { result, unmount } = renderHook(() =>
      useAdminUserVideo('u1', `/uploads/videos/${uuid}.mp4`),
    );

    await waitFor(() => expect(result.current).toBe('blob:admin-user-video'));
    expect(adminApi.get).toHaveBeenCalledWith(`/admin/users/u1/video`, { responseType: 'blob' });

    act(() => unmount());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:admin-user-video');
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('falls back to null when the admin-authenticated fetch fails', async () => {
    vi.mocked(adminApi.get).mockRejectedValue(new Error('not found'));

    const { result } = renderHook(() => useAdminUserVideo('u1', `/uploads/videos/${uuid}.mp4`));

    await waitFor(() => expect(adminApi.get).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
