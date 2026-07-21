import { FastifyPluginAsync } from 'fastify';

import { createReportSchema } from '../../../schemas/v1/index.js';
import { ReportsService } from '../../../services/reports.js';
import { CreateReportPayload } from '../../../types/report.js';

const routes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const { prisma } = fastify;
  const reportsService = new ReportsService({ prisma });

  fastify.post<{ Params: { reportedId: string }; Body: CreateReportPayload }>(
    '/profiles/:reportedId',
    { schema: createReportSchema },
    async (request, reply) => {
      const report = await reportsService.createReport(
        request.loggedUser.id,
        request.params.reportedId,
        request.body,
      );
      return reply.code(200).send({ report });
    },
  );
};

export default routes;
