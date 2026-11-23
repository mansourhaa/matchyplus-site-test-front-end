import { FastifyPluginAsync } from 'fastify';

import {
  ONBOARDING_RELABEL_RATE_LIMIT,
  ONBOARDING_VIDEO_ANALYSIS_POLL_RATE_LIMIT,
  ONBOARDING_VIDEO_ANALYSIS_RATE_LIMIT,
} from '../../../constants.js';
import {
  getOnboardingVideoAnalysisSchema,
  relabelOnboardingFieldsSchema,
  startOnboardingVideoAnalysisSchema,
} from '../../../schemas/v1/index.js';
import { AiJobsService } from '../../../services/ai-jobs.js';
import { VideoAnalysisService } from '../../../services/video-analysis.js';
import { VoiceRelabelService } from '../../../services/voice-relabel.js';
import {
  OnboardingVideoAnalysisParams,
  OnboardingVideoAnalysisQuery,
  RelabelOnboardingFieldsBody,
  StartOnboardingVideoAnalysisBody,
  VideoAnalysisLocale,
} from '../../../types/video-analysis.js';
import { badRequest, notFound } from '../../../utils/http-errors.js';

const LOCALES = new Set<VideoAnalysisLocale>(['fr', 'ar', 'en']);

function serializeJob(job: {
  id: string;
  type: string;
  status: string;
  result: unknown;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    result: (job.result as Record<string, unknown> | null) ?? null,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

// Public on purpose (no autohooks token check): the signup form is pre-filled from the
// video before the SMS check, when no account exists yet. Rate-limited per IP.
const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const aiJobs = new AiJobsService({ prisma: fastify.prisma, redis: fastify.redisClient });
  const videoAnalysis = new VideoAnalysisService({ prisma: fastify.prisma, aiJobs });
  // Stale clips are cleaned in the background, not in POST /video-analysis.
  const stopClipSweeper = videoAnalysis.startClipSweeper();
  fastify.addHook('onClose', async () => stopClipSweeper());
  const voiceRelabel = new VoiceRelabelService();

  fastify.post<{ Body: StartOnboardingVideoAnalysisBody }>(
    '/video-analysis',
    {
      schema: startOnboardingVideoAnalysisSchema,
      config: { rateLimit: ONBOARDING_VIDEO_ANALYSIS_RATE_LIMIT },
    },
    async (request, reply) => {
      try {
        const video = request.body?.video;
        if (!video || video.type !== 'file') {
          throw badRequest('video is required', 'video_required');
        }
        const rawLocale = request.body?.uiLocale?.value ?? 'fr';
        if (!LOCALES.has(rawLocale as VideoAnalysisLocale)) {
          throw badRequest('uiLocale must be fr, ar or en', 'invalid_locale');
        }

        const { job, token } = await videoAnalysis.startFromClip(
          {
            buffer: await video.toBuffer(),
            filename: video.filename,
            mimetype: video.mimetype,
          },
          rawLocale as VideoAnalysisLocale,
        );
        return reply.code(202).send({ job: serializeJob(job), token });
      } catch (err) {
        const statusCode = (err as Error & { statusCode?: number }).statusCode;
        if (statusCode === 503) {
          return reply.code(503).send({
            status: 503,
            code: 'AI_QUEUE_UNAVAILABLE',
            message: (err as Error).message,
          });
        }
        throw err;
      }
    },
  );

  fastify.get<{ Params: OnboardingVideoAnalysisParams; Querystring: OnboardingVideoAnalysisQuery }>(
    '/video-analysis/:jobId',
    {
      schema: getOnboardingVideoAnalysisSchema,
      config: { rateLimit: ONBOARDING_VIDEO_ANALYSIS_POLL_RATE_LIMIT },
    },
    async (request, reply) => {
      try {
        const job = await videoAnalysis.getClipStatus(request.params.jobId, request.query.token);
        if (!job) throw notFound('video analysis job not found', 'job_not_found');
        reply.header('Cache-Control', 'private, no-store');
        return reply.code(200).send({ job: serializeJob(job) });
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.post<{ Body: RelabelOnboardingFieldsBody }>(
    '/relabel',
    {
      schema: relabelOnboardingFieldsSchema,
      config: { rateLimit: ONBOARDING_RELABEL_RATE_LIMIT },
    },
    async (request, reply) => {
      try {
        const data = await voiceRelabel.relabel(request.body);
        return reply.code(200).send(data);
      } catch (err) {
        if ((err as Error & { statusCode?: number }).statusCode === 503) {
          return reply.code(503).send({
            status: 503,
            code: 'VOICE_AI_UNAVAILABLE',
            message: (err as Error).message,
          });
        }
        throw err;
      }
    },
  );
};

export default routes;
