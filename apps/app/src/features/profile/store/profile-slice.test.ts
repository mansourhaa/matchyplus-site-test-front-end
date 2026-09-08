import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import profileReducer, {
  deleteProfilePhoto,
  deleteProfileVideo,
  fetchBlockedUsers,
  fetchPublicProfile,
  rateProfile,
  unblockProfile,
  uploadProfilePhoto,
  uploadProfileVideo,
} from './profile-slice';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const publicProfile = {
  id: 'user-2',
  name: 'Jane Doe',
  job: 'Électricien',
  bio: null,
  image: '/uploads/photos/abc.jpg',
  video: null,
  city: 'Tunis',
  interests: ['Bricolage'],
  languages: ['fr'],
  contact_modes: ['whatsapp'],
  offer_service: false,
  service_type: null,
  price: null,
  profile_type: 'INDIVIDUAL' as const,
  rating: null,
  reviews: null,
};

function buildStore() {
  return configureStore({ reducer: { profile: profileReducer } });
}

describe('profile-slice', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetchPublicProfile populates state.viewedProfile from GET /profiles/:id', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: publicProfile });

    const store = buildStore();
    await store.dispatch(fetchPublicProfile('user-2'));

    expect(api.get).toHaveBeenCalledWith('/profiles/user-2');
    expect(store.getState().profile.viewedProfile).toEqual(publicProfile);
  });

  it('fetchPublicProfile surfaces the API error code instead of a generic axios message', async () => {
    vi.mocked(api.get).mockRejectedValue({
      isAxiosError: true,
      response: { data: { code: 'blocked' } },
    });

    const store = buildStore();
    await store.dispatch(fetchPublicProfile('user-2'));

    expect(store.getState().profile.viewedProfileError).toBe('blocked');
  });

  it('uploadProfilePhoto posts a FormData with the file under the "photo" field', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { image: '/uploads/photos/new.jpg' } });
    const file = new File(['abc'], 'photo.jpg', { type: 'image/jpeg' });

    const store = buildStore();
    await store.dispatch(uploadProfilePhoto(file));

    expect(api.post).toHaveBeenCalledWith('/users/me/profile/photo', expect.any(FormData));
    const formData = vi.mocked(api.post).mock.calls[0]?.[1] as FormData;
    expect(formData.get('photo')).toBe(file);
    expect(store.getState().profile.mediaUploading).toBe(false);
    expect(store.getState().profile.mediaError).toBeNull();
  });

  it('uploadProfilePhoto surfaces a photo_too_large error code', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { code: 'photo_too_large' } },
    });
    const file = new File(['abc'], 'photo.jpg', { type: 'image/jpeg' });

    const store = buildStore();
    await store.dispatch(uploadProfilePhoto(file));

    expect(store.getState().profile.mediaError).toBe('photo_too_large');
  });

  it('deleteProfilePhoto calls DELETE /users/me/profile/photo', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { image: null } });

    const store = buildStore();
    await store.dispatch(deleteProfilePhoto());

    expect(api.delete).toHaveBeenCalledWith('/users/me/profile/photo');
    expect(store.getState().profile.mediaError).toBeNull();
  });

  it('uploadProfileVideo posts a FormData with the file under the "video" field', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { video: '/uploads/videos/new.mp4' } });
    const file = new File(['abc'], 'video.mp4', { type: 'video/mp4' });

    const store = buildStore();
    await store.dispatch(uploadProfileVideo(file));

    expect(api.post).toHaveBeenCalledWith('/users/me/profile/video', expect.any(FormData));
    const formData = vi.mocked(api.post).mock.calls[0]?.[1] as FormData;
    expect(formData.get('video')).toBe(file);
  });

  it('deleteProfileVideo calls DELETE /users/me/profile/video', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { video: null } });

    const store = buildStore();
    await store.dispatch(deleteProfileVideo());

    expect(api.delete).toHaveBeenCalledWith('/users/me/profile/video');
  });

  it('rateProfile marks the cached viewed profile as already rated, so reopening it does not show the picker again', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { ...publicProfile, viewer_has_rated: false },
    });
    vi.mocked(api.post).mockResolvedValue({ data: { rating: 4.5, reviews: 3 } });
    const store = buildStore();
    await store.dispatch(fetchPublicProfile('user-2'));

    await store.dispatch(rateProfile({ userId: 'user-2', value: 5 }));

    expect(api.post).toHaveBeenCalledWith('/profiles/user-2/rating', { rating: 5 });
    expect(store.getState().profile.viewedProfile).toMatchObject({
      rating: 4.5,
      reviews: 3,
      viewer_has_rated: true,
    });
  });

  it('fetchBlockedUsers fetches list from GET /profiles/blocked', async () => {
    const blockedList = [
      {
        id: 'user-3',
        name: 'Blocked User',
        image: null,
        job: null,
        city: null,
        activity_sector: null,
        service_type: null,
      },
    ];
    vi.mocked(api.get).mockResolvedValue({ data: blockedList });

    const store = buildStore();
    await store.dispatch(fetchBlockedUsers());

    expect(api.get).toHaveBeenCalledWith('/profiles/blocked');
    expect(store.getState().profile.blockedUsers).toEqual(blockedList);
  });

  it('unblockProfile calls DELETE /profiles/:id/block and removes user from state', async () => {
    const blockedList = [
      {
        id: 'user-3',
        name: 'Blocked User',
        image: null,
        job: null,
        city: null,
        activity_sector: null,
        service_type: null,
      },
    ];
    vi.mocked(api.get).mockResolvedValue({ data: blockedList });
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    const store = buildStore();
    await store.dispatch(fetchBlockedUsers());
    expect(store.getState().profile.blockedUsers).toHaveLength(1);

    await store.dispatch(unblockProfile('user-3'));
    expect(api.delete).toHaveBeenCalledWith('/profiles/user-3/block');
    expect(store.getState().profile.blockedUsers).toHaveLength(0);
  });
});
