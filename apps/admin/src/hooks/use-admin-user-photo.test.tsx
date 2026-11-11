import { adminApi } from '@/lib/admin-api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearPhotoCache, useAdminUserPhoto } from './use-admin-user-photo';

vi.mock('@/lib/admin-api', () => ({
  adminApi: { get: vi.fn() },
}));

const uuid = '1f3e4151-7f9c-4d7b-a780-c41ef4207feb';

describe('useAdminUserPhoto', () => {
  afterEach(() => {
    clearPhotoCache();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it('passes through a legacy base64 data URL without calling the API', () => {
    const dataUrl = 'data:image/png;base64,abc';
    const { result } = renderHook(() => useAdminUserPhoto('u1', dataUrl));

    expect(result.current).toBe(dataUrl);
    expect(adminApi.get).not.toHaveBeenCalled();
  });

  it('passes through an external OAuth avatar URL without calling the API', () => {
    const externalUrl = 'https://lh3.googleusercontent.com/a/foo';
    const { result } = renderHook(() => useAdminUserPhoto('u1', externalUrl));

    expect(result.current).toBe(externalUrl);
    expect(adminApi.get).not.toHaveBeenCalled();
  });

  it('returns null for a user with no image', () => {
    const { result } = renderHook(() => useAdminUserPhoto('u1', null));

    expect(result.current).toBeNull();
    expect(adminApi.get).not.toHaveBeenCalled();
  });

  // Regression: a plain <img src="/uploads/photos/..."> 404'd for every uploaded photo
  // because that path only exists on the API host, behind the member session — not the
  // separate admin session. Uploaded photos must go through the admin-authenticated
  // GET /admin/users/:id/photo route and be exposed as an object URL instead.
  it('fetches a stored photo path through the admin-authenticated route and exposes an object URL', async () => {
    const createObjectURL = vi.fn(() => 'blob:admin-user-photo');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    vi.mocked(adminApi.get).mockResolvedValue({ data: new Blob(['photo']) });

    const { result, unmount } = renderHook(() =>
      useAdminUserPhoto('u1', `/uploads/photos/${uuid}.jpg`),
    );

    await waitFor(() => expect(result.current).toBe('blob:admin-user-photo'));
    expect(adminApi.get).toHaveBeenCalledWith(`/admin/users/u1/photo`, { responseType: 'blob' });

    act(() => unmount());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:admin-user-photo');
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('falls back to null when the admin-authenticated fetch fails', async () => {
    vi.mocked(adminApi.get).mockRejectedValue(new Error('not found'));

    const { result } = renderHook(() => useAdminUserPhoto('u1', `/uploads/photos/${uuid}.jpg`));

    await waitFor(() => expect(adminApi.get).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('reuses the cached blob for duplicate requests and avoids duplicate API calls', async () => {
    const createObjectURL = vi.fn(() => 'blob:cached-user-photo');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    vi.mocked(adminApi.get).mockResolvedValue({ data: new Blob(['cached-photo']) });

    const { result: firstResult } = renderHook(() =>
      useAdminUserPhoto('u2', `/uploads/photos/${uuid}.jpg`),
    );
    await waitFor(() => expect(firstResult.current).toBe('blob:cached-user-photo'));
    expect(adminApi.get).toHaveBeenCalledTimes(1);

    const { result: secondResult } = renderHook(() =>
      useAdminUserPhoto('u2', `/uploads/photos/${uuid}.jpg`),
    );
    await waitFor(() => expect(secondResult.current).toBe('blob:cached-user-photo'));
    // Should still be called only once due to blob cache
    expect(adminApi.get).toHaveBeenCalledTimes(1);

    Reflect.deleteProperty(URL, 'createObjectURL');
  });
});
