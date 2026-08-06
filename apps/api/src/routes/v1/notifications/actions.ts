import { FastifyPluginAsync } from 'fastify';

import {
  getNotificationPreferencesSchema,
  listNotificationsSchema,
  markAllNotificationsReadSchema,
  markNotificationReadSchema,
  updateNotificationPreferencesSchema,
} from '../../../schemas/v1/index.js';
import { NotificationService } from '../../../services/notification.js';
import {
  MarkNotificationReadParams,
  UpdateNotificationPreferencesBody,
} from '../../../types/notification.js';

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const { prisma } = fastify;
  const notifications = new NotificationService({
    prisma,
    push: (userId, event, payload) => fastify.notifyUser(userId, event, payload),
  });

  fastify.get('/', { schema: listNotificationsSchema }, async (request, reply) => {
    try {
      const [items, unreadCount] = await Promise.all([
        notifications.list(request.loggedUser.id),
        notifications.unreadCount(request.loggedUser.id),
      ]);
      return reply.code(200).send({ notifications: items, unread_count: unreadCount });
    } catch (err) {
      throw err;
    }
  });

  // Registered before `/:id/read` so "preferences" is not captured as an id.
  fastify.get(
    '/preferences',
    { schema: getNotificationPreferencesSchema },
    async (request, reply) => {
      try {
        const preferences = await notifications.getPreferences(request.loggedUser.id);
        return reply.code(200).send({ preferences });
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.put<{ Body: UpdateNotificationPreferencesBody }>(
    '/preferences',
    { schema: updateNotificationPreferencesSchema },
    async (request, reply) => {
      try {
        const preferences = await notifications.updatePreferences(
          request.loggedUser.id,
          request.body,
        );
        return reply.code(200).send({ preferences });
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.post<{ Params: MarkNotificationReadParams }>(
    '/:id/read',
    { schema: markNotificationReadSchema },
    async (request, reply) => {
      try {
        const data = await notifications.markRead(request.loggedUser.id, request.params);
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.post('/read-all', { schema: markAllNotificationsReadSchema }, async (request, reply) => {
    try {
      const data = await notifications.markAllRead(request.loggedUser.id);
      return reply.code(200).send(data);
    } catch (err) {
      throw err;
    }
  });
};

export default routes;
