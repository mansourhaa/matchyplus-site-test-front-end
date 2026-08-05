import { FastifyPluginAsync } from 'fastify';

import {
  listNotificationsSchema,
  markAllNotificationsReadSchema,
  markNotificationReadSchema,
} from '../../../schemas/v1/index.js';
import { NotificationService } from '../../../services/notification.js';
import { MarkNotificationReadParams } from '../../../types/notification.js';

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
