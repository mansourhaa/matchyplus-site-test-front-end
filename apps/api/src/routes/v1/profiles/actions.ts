import { FastifyPluginAsync } from 'fastify';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  getProfilePhotoFileSchema,
  getProfileVideoFileSchema,
  getPublicProfileSchema,
} from '../../../schemas/v1/index.js';
import { ProfileService } from '../../../services/profile.js';
import { ProfileIdParams, ProfileMediaFilenameParams } from '../../../types/profile.js';
import { badRequest, forbidden, notFound } from '../../../utils/http-errors.js';
import { PHOTOS_DIR, VIDEOS_DIR } from '../../../utils/media-storage.js';

const VIDEO_CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.3gp': 'video/3gpp',
  '.3g2': 'video/3gpp2',
};

const PHOTO_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function assertSafeFilename(filename: string) {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw badRequest('invalid filename', 'invalid_filename');
  }
}

function extensionOf(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
}

function parseRange(
  value: string | undefined,
  size: number,
): { start: number; end: number } | null {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) throw badRequest('invalid range', 'invalid_range');

  const requestedStart = match[1] ? Number(match[1]) : null;
  const requestedEnd = match[2] ? Number(match[2]) : null;
  let start = requestedStart ?? Math.max(size - (requestedEnd ?? 0), 0);
  let end = requestedStart === null ? size - 1 : (requestedEnd ?? size - 1);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    throw badRequest('invalid range', 'invalid_range');
  }
  start = Math.min(start, size - 1);
  end = Math.min(end, size - 1);
  return { start, end };
}

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const { prisma } = fastify;
  const profileService = new ProfileService({ prisma });

  fastify.get<{ Params: ProfileIdParams }>(
    '/:id',
    { schema: getPublicProfileSchema },
    async (request, reply) => {
      try {
        const data = await profileService.getPublicProfile(
          request.loggedUser.id,
          request.params.id,
        );
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  // Photos are shown as part of any profile a member can already view — no extra
  // relationship check, matching legacy (only video is access-gated there).
  fastify.get<{ Params: ProfileMediaFilenameParams }>(
    '/media/photos/:filename',
    { schema: getProfilePhotoFileSchema },
    async (request, reply) => {
      try {
        const { filename } = request.params;
        assertSafeFilename(filename);
        const contentType = PHOTO_CONTENT_TYPES[extensionOf(filename)];
        if (!contentType) throw badRequest('invalid filename', 'invalid_filename');

        const owner = await prisma.user.findFirst({
          where: { image: `/uploads/photos/${filename}` },
          select: { id: true },
        });
        if (!owner) throw notFound('photo not found', 'photo_not_found');
        await profileService.assertCanViewProfile(request.loggedUser.id, owner.id);

        const filePath = join(PHOTOS_DIR, filename);
        if (!existsSync(filePath)) {
          throw notFound('photo not found', 'photo_not_found');
        }

        reply.header('Content-Type', contentType);
        reply.header('Cache-Control', 'private, max-age=86400');
        return reply.send(createReadStream(filePath));
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get<{ Params: ProfileMediaFilenameParams }>(
    '/media/videos/:filename',
    { schema: getProfileVideoFileSchema },
    async (request, reply) => {
      try {
        const { filename } = request.params;
        assertSafeFilename(filename);
        const contentType = VIDEO_CONTENT_TYPES[extensionOf(filename)];
        if (!contentType) throw badRequest('invalid filename', 'invalid_filename');

        const owner = await prisma.user.findFirst({
          where: { video: `/uploads/videos/${filename}` },
          select: { id: true },
        });
        if (!owner) {
          throw notFound('video not found', 'video_not_found');
        }

        const allowed = await profileService.canAccessVideo(request.loggedUser.id, owner.id);
        if (!allowed) {
          throw forbidden('video access denied', 'video_access_denied');
        }

        const filePath = join(VIDEOS_DIR, filename);
        if (!existsSync(filePath)) {
          throw notFound('video not found', 'video_not_found');
        }

        const size = statSync(filePath).size;
        const range = parseRange(request.headers.range, size);
        reply.header('Content-Type', contentType);
        reply.header('Accept-Ranges', 'bytes');
        reply.header('Cache-Control', 'private, no-store');
        if (!range) {
          reply.header('Content-Length', size);
          return reply.send(createReadStream(filePath));
        }

        reply.code(206);
        reply.header('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
        reply.header('Content-Length', range.end - range.start + 1);
        return reply.send(createReadStream(filePath, range));
      } catch (err) {
        throw err;
      }
    },
  );
};

export default routes;
