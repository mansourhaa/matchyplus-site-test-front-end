import { FastifyPluginAsync } from 'fastify';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';

import { VOICE_AUDIO_CONTENT_TYPES, VOICE_AUDIO_RATE_LIMIT } from '../../../constants.js';
import {
  getAudioFileSchema,
  getConversationSchema,
  listConversationsSchema,
  listMessagesSchema,
  markReadSchema,
  messageQuotaSchema,
  sendMessageSchema,
  toggleLikeSchema,
  typingSchema,
  uploadAudioSchema,
} from '../../../schemas/v1/conversations.js';
import { ConversationService } from '../../../services/conversation.js';
import {
  ConversationAudioFilenameParams,
  ConversationIdParams,
  ConversationMessageParams,
  ListMessagesQuery,
  SendMessageBody,
  TypingBody,
  UploadAudioBody,
} from '../../../types/conversations.js';
import { badRequest, forbidden, notFound } from '../../../utils/http-errors.js';
import { assertSafeFilename, extensionOf } from '../../../utils/media-http.js';
import { AUDIO_DIR } from '../../../utils/media-storage.js';

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const conversations = new ConversationService({
    prisma: fastify.prisma,
    notify: (userId, event, payload) => fastify.notifyUser(userId, event, payload),
  });

  fastify.get('/', { schema: listConversationsSchema }, async (request, reply) => {
    try {
      const data = await conversations.listInbox(request.loggedUser.id);
      return reply.code(200).send(data);
    } catch (err) {
      throw err;
    }
  });

  fastify.get('/quota', { schema: messageQuotaSchema }, async (request, reply) => {
    try {
      const data = await conversations.getQuota(request.loggedUser.id);
      return reply.code(200).send(data);
    } catch (err) {
      throw err;
    }
  });

  fastify.post<{ Body: UploadAudioBody }>(
    '/upload-audio',
    {
      schema: uploadAudioSchema,
      config: { rateLimit: VOICE_AUDIO_RATE_LIMIT },
    },
    async (request, reply) => {
      try {
        const file = request.body?.file;
        if (!file) {
          throw badRequest('audio file is required', 'audio_required');
        }
        const result = await conversations.uploadAudio(request.loggedUser.id, {
          buffer: await file.toBuffer(),
          filename: file.filename,
          mimetype: file.mimetype,
        });
        return reply.code(200).send(result);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get<{ Params: ConversationAudioFilenameParams }>(
    '/audio/:filename',
    { schema: getAudioFileSchema },
    async (request, reply) => {
      try {
        const { filename } = request.params;
        assertSafeFilename(filename);
        const contentType = VOICE_AUDIO_CONTENT_TYPES[extensionOf(filename)];
        if (!contentType) throw badRequest('invalid filename', 'invalid_filename');

        const allowed = await conversations.canAccessAudio(request.loggedUser.id, filename);
        if (!allowed) throw forbidden('audio access denied', 'audio_access_denied');

        const filePath = join(AUDIO_DIR, filename);
        if (!existsSync(filePath)) {
          throw notFound('audio not found', 'audio_not_found');
        }

        reply.header('Content-Type', contentType);
        reply.header('Cache-Control', 'private, no-store');
        return reply.send(createReadStream(filePath));
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get<{ Params: ConversationIdParams }>(
    '/:id',
    { schema: getConversationSchema },
    async (request, reply) => {
      try {
        const data = await conversations.getConversation(request.loggedUser.id, request.params.id);
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get<{ Params: ConversationIdParams; Querystring: ListMessagesQuery }>(
    '/:id/messages',
    { schema: listMessagesSchema },
    async (request, reply) => {
      try {
        const data = await conversations.listMessages(
          request.loggedUser.id,
          request.params.id,
          request.query,
        );
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.post<{ Params: ConversationIdParams; Body: SendMessageBody }>(
    '/:id/messages',
    { schema: sendMessageSchema },
    async (request, reply) => {
      try {
        const data = await conversations.sendMessage(
          request.loggedUser.id,
          request.params.id,
          request.body,
        );
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.post<{ Params: ConversationIdParams }>(
    '/:id/read',
    { schema: markReadSchema },
    async (request, reply) => {
      try {
        const data = await conversations.markRead(request.loggedUser.id, request.params.id);
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.post<{ Params: ConversationIdParams; Body: TypingBody }>(
    '/:id/typing',
    { schema: typingSchema },
    async (request, reply) => {
      try {
        const data = await conversations.setTyping(
          request.loggedUser.id,
          request.params.id,
          Boolean(request.body.is_typing),
        );
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.post<{ Params: ConversationMessageParams }>(
    '/:id/messages/:messageId/like',
    { schema: toggleLikeSchema },
    async (request, reply) => {
      try {
        const data = await conversations.toggleLike(
          request.loggedUser.id,
          request.params.id,
          request.params.messageId,
        );
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );
};

export default routes;
