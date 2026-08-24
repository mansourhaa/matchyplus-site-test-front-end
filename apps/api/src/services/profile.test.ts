import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteMediaFile, saveMediaFile } from '../utils/media-storage.js';
import { ProfileService } from './profile.js';

vi.mock('../utils/media-storage.js', () => ({
  PHOTOS_DIR: '/uploads/photos',
  VIDEOS_DIR: '/uploads/videos',
  saveMediaFile: vi.fn(),
  deleteMediaFile: vi.fn(),
  isStoredMediaPath: (value: string | null) => Boolean(value) && !value?.startsWith('data:'),
  filenameFromStoredPath: (value: string) => value.split('/').pop(),
}));

function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    userBlock: {
      findFirst: vi.fn(),
    },
    match: {
      findUnique: vi.fn(),
    },
    conversation: {
      findUnique: vi.fn(),
    },
    rating: {
      findUnique: vi.fn(),
    },
  };
}

function createService(prisma = createMockPrisma()) {
  const service = new ProfileService({ prisma: prisma as never });
  return { service, prisma };
}

const activeUser = {
  id: 'user-2',
  name: 'Jane Doe',
  job: 'Électricien',
  bio: 'Bio text',
  image: '/uploads/photos/abc.jpg',
  video: null,
  city: 'Tunis',
  interests: ['Bricolage'],
  languages: ['fr'],
  contact_modes: ['whatsapp'],
  offer_service: false,
  service_type: null,
  price: null,
  profile_type: 'INDIVIDUAL',
  rating: 0,
  reviews: 0,
  status: 'ACTIVE',
};

describe('ProfileService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPublicProfile', () => {
    it('returns the public-safe fields, nulling out zero rating/reviews', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(activeUser);
      prisma.userBlock.findFirst.mockResolvedValue(null);

      const result = await service.getPublicProfile('user-1', 'user-2');

      expect(result).toEqual({
        id: 'user-2',
        name: 'Jane Doe',
        job: 'Électricien',
        bio: 'Bio text',
        image: '/uploads/photos/abc.jpg',
        video: null,
        city: 'Tunis',
        interests: ['Bricolage'],
        languages: ['fr'],
        contact_modes: ['whatsapp'],
        offer_service: false,
        service_type: null,
        price: null,
        profile_type: 'INDIVIDUAL',
        rating: null,
        reviews: null,
        matched: false,
        viewer_has_rated: false,
      });
      expect(result).not.toHaveProperty('status');
    });

    it('keeps a real rating/reviews count when present', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, rating: 4.5, reviews: 3 });
      prisma.userBlock.findFirst.mockResolvedValue(null);

      const result = await service.getPublicProfile('user-1', 'user-2');

      expect(result.rating).toBe(4.5);
      expect(result.reviews).toBe(3);
    });

    it('reports viewer_has_rated: true when the viewer already rated this profile', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(activeUser);
      prisma.userBlock.findFirst.mockResolvedValue(null);
      prisma.rating.findUnique.mockResolvedValue({ id: 'rating-1' });

      const result = await service.getPublicProfile('user-1', 'user-2');

      expect(prisma.rating.findUnique).toHaveBeenCalledWith({
        where: { rater_id_ratee_id: { rater_id: 'user-1', ratee_id: 'user-2' } },
        select: { id: true },
      });
      expect(result.viewer_has_rated).toBe(true);
    });

    it('never checks viewer_has_rated when viewing your own profile', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(activeUser);

      const result = await service.getPublicProfile('user-2', 'user-2');

      expect(prisma.rating.findUnique).not.toHaveBeenCalled();
      expect(result.viewer_has_rated).toBe(false);
    });

    it('rejects with profile_not_found when the target does not exist', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.userBlock.findFirst.mockResolvedValue(null);

      await expect(service.getPublicProfile('user-1', 'user-2')).rejects.toMatchObject({
        statusCode: 404,
        code: 'profile_not_found',
      });
    });

    it('rejects with profile_not_found for a banned/inactive account', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, status: 'BANNED' });
      prisma.userBlock.findFirst.mockResolvedValue(null);

      await expect(service.getPublicProfile('user-1', 'user-2')).rejects.toMatchObject({
        statusCode: 404,
        code: 'profile_not_found',
      });
    });

    it('rejects with a blocked error when either side has blocked the other', async () => {
      const { service, prisma } = createService();
      prisma.userBlock.findFirst.mockResolvedValue({ id: 'block-1' });

      await expect(service.getPublicProfile('user-1', 'user-2')).rejects.toMatchObject({
        statusCode: 403,
        code: 'blocked',
      });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('never runs the block check when viewing your own profile', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(activeUser);

      await service.getPublicProfile('user-2', 'user-2');

      expect(prisma.userBlock.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('canAccessVideo', () => {
    it('always allows the owner', async () => {
      const { service, prisma } = createService();
      const result = await service.canAccessVideo('user-1', 'user-1');
      expect(result).toBe(true);
      expect(prisma.match.findUnique).not.toHaveBeenCalled();
    });

    it('allows a viewer with an active match', async () => {
      const { service, prisma } = createService();
      prisma.match.findUnique.mockResolvedValue({ id: 'match-1' });

      const result = await service.canAccessVideo('user-1', 'user-2');

      expect(result).toBe(true);
    });

    it('rejects a viewer with no match or conversation', async () => {
      const { service, prisma } = createService();
      prisma.match.findUnique.mockResolvedValue(null);
      prisma.conversation.findUnique.mockResolvedValue(null);

      const result = await service.canAccessVideo('user-1', 'user-2');

      expect(result).toBe(false);
    });

    it('allows a viewer with a conversation after unmatch', async () => {
      const { service, prisma } = createService();
      prisma.match.findUnique.mockResolvedValue(null);
      prisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });

      const result = await service.canAccessVideo('user-1', 'user-2');

      expect(result).toBe(true);
    });
  });

  describe('uploadPhoto', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00]);

    it('rejects a file over the 8MB limit without touching storage', async () => {
      const { service } = createService();
      const oversized = Buffer.alloc(9 * 1024 * 1024);

      await expect(
        service.uploadPhoto('user-1', {
          buffer: oversized,
          filename: 'photo.jpg',
          mimetype: 'image/jpeg',
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'photo_too_large' });
      expect(saveMediaFile).not.toHaveBeenCalled();
    });

    it('rejects an unsupported/invalid file without touching storage', async () => {
      const { service } = createService();
      const notAnImage = Buffer.from('not an image');

      await expect(
        service.uploadPhoto('user-1', {
          buffer: notAnImage,
          filename: 'photo.jpg',
          mimetype: 'image/jpeg',
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(saveMediaFile).not.toHaveBeenCalled();
    });

    it('saves a valid photo, deletes the old stored file, and updates User.image', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ image: '/uploads/photos/old.jpg' });
      vi.mocked(saveMediaFile).mockResolvedValue('new.jpg');

      const result = await service.uploadPhoto('user-1', {
        buffer: jpegBuffer,
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
      });

      expect(deleteMediaFile).toHaveBeenCalledWith('/uploads/photos', 'old.jpg');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { image: '/uploads/photos/new.jpg' },
      });
      expect(result).toEqual({ image: '/uploads/photos/new.jpg' });
    });

    it('does not try to delete a base64 data URL as if it were a stored file', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ image: 'data:image/png;base64,abc' });
      vi.mocked(saveMediaFile).mockResolvedValue('new.jpg');

      await service.uploadPhoto('user-1', {
        buffer: jpegBuffer,
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
      });

      expect(deleteMediaFile).not.toHaveBeenCalled();
    });
  });

  describe('deletePhoto', () => {
    it('deletes the stored file and nulls User.image', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ image: '/uploads/photos/old.jpg' });

      const result = await service.deletePhoto('user-1');

      expect(deleteMediaFile).toHaveBeenCalledWith('/uploads/photos', 'old.jpg');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { image: null },
      });
      expect(result).toEqual({ image: null });
    });
  });

  describe('uploadVideo', () => {
    const mp4Header = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x18]),
      Buffer.from('ftyp', 'ascii'),
      Buffer.alloc(8),
    ]);

    it('rejects a file over the 50MB limit without touching storage', async () => {
      const { service } = createService();
      const oversized = { byteLength: 50 * 1024 * 1024 + 1 } as Buffer;

      await expect(
        service.uploadVideo('user-1', {
          buffer: oversized,
          filename: 'video.mp4',
          mimetype: 'video/mp4',
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'video_too_large' });
      expect(saveMediaFile).not.toHaveBeenCalled();
    });

    it('rejects an unsupported/invalid video without touching storage', async () => {
      const { service } = createService();

      await expect(
        service.uploadVideo('user-1', {
          buffer: Buffer.from('not a video'),
          filename: 'video.mp4',
          mimetype: 'video/mp4',
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(saveMediaFile).not.toHaveBeenCalled();
    });

    it('saves a valid video, deletes the old stored file, and updates User.video', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ video: '/uploads/videos/old.mp4' });
      vi.mocked(saveMediaFile).mockResolvedValue('new.mp4');

      const result = await service.uploadVideo('user-1', {
        buffer: mp4Header,
        filename: 'video.mp4',
        mimetype: 'video/mp4',
      });

      expect(deleteMediaFile).toHaveBeenCalledWith('/uploads/videos', 'old.mp4');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { video: '/uploads/videos/new.mp4' },
      });
      expect(result).toEqual({ video: '/uploads/videos/new.mp4' });
    });
  });

  describe('deleteVideo', () => {
    it('deletes the stored file and nulls User.video', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ video: '/uploads/videos/old.mp4' });

      const result = await service.deleteVideo('user-1');

      expect(deleteMediaFile).toHaveBeenCalledWith('/uploads/videos', 'old.mp4');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { video: null },
      });
      expect(result).toEqual({ video: null });
    });

    it('does nothing to storage when there is no existing video', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ video: null });

      await service.deleteVideo('user-1');

      expect(deleteMediaFile).not.toHaveBeenCalled();
    });
  });

  describe('getViewNotificationInfo', () => {
    it('returns null for a self-view, without checking blocks or fetching the profile', async () => {
      const { service, prisma } = createService();

      const result = await service.getViewNotificationInfo('user-1', 'user-1');

      expect(result).toBeNull();
      expect(prisma.userBlock.findFirst).not.toHaveBeenCalled();
    });

    it('rejects when the target profile is blocked or inactive', async () => {
      const { service, prisma } = createService();
      prisma.userBlock.findFirst.mockResolvedValue({ id: 'block-1' });

      await expect(service.getViewNotificationInfo('user-1', 'user-2')).rejects.toMatchObject({
        code: 'blocked',
      });
    });

    it('returns the viewer id, first name, and photo for a valid view of another profile', async () => {
      const { service, prisma } = createService();
      prisma.userBlock.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ status: 'ACTIVE' });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        name: 'Jane Doe',
        image: '/uploads/photos/jane.jpg',
      });

      const result = await service.getViewNotificationInfo('user-1', 'user-2');

      expect(result).toEqual({
        viewerId: 'user-1',
        viewerName: 'Jane',
        viewerImage: '/uploads/photos/jane.jpg',
      });
    });

    it('falls back to a generic name when the viewer has none set', async () => {
      const { service, prisma } = createService();
      prisma.userBlock.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ status: 'ACTIVE' });
      prisma.user.findUniqueOrThrow.mockResolvedValue({ name: '  ', image: null });

      const result = await service.getViewNotificationInfo('user-1', 'user-2');

      expect(result).toEqual({
        viewerId: 'user-1',
        viewerName: "Quelqu'un",
        viewerImage: null,
      });
    });
  });
});
