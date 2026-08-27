import { FastifyPluginAsync } from 'fastify';

import {
  getFavoriteIdsSchema,
  getFavoritesSchema,
  removeFavoriteSchema,
  toggleFavoriteSchema,
} from '../../../schemas/v1/index.js';
import { FavoritesService } from '../../../services/favorites.js';
import { FavoriteParams, FavoritesListQuery } from '../../../types/favorites.js';

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const { prisma } = fastify;
  const favoritesService = new FavoritesService({ prisma });

  fastify.get<{ Querystring: FavoritesListQuery }>(
    '/',
    { schema: getFavoritesSchema },
    async (request, reply) => {
      try {
        const data = await favoritesService.getFavorites(request.loggedUser.id, request.query);
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get('/ids', { schema: getFavoriteIdsSchema }, async (request, reply) => {
    try {
      const data = await favoritesService.getFavoriteIds(request.loggedUser.id);
      return reply.code(200).send(data);
    } catch (err) {
      throw err;
    }
  });

  fastify.post<{ Params: FavoriteParams }>(
    '/:targetUserId',
    { schema: toggleFavoriteSchema },
    async (request, reply) => {
      try {
        const data = await favoritesService.toggleFavorite(
          request.loggedUser.id,
          request.params.targetUserId,
        );
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.delete<{ Params: FavoriteParams }>(
    '/:targetUserId',
    { schema: removeFavoriteSchema },
    async (request, reply) => {
      try {
        const data = await favoritesService.removeFavorite(
          request.loggedUser.id,
          request.params.targetUserId,
        );
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );
};

export default routes;
