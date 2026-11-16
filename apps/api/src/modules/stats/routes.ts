import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { idParams, pickErrors } from '../../lib/schemas.js';
import { habitStatsSchema, statsQuery } from './schemas.js';
import type { StatsService } from './service.js';

export const statsRoutes: FastifyPluginAsyncZod<{ service: StatsService }> = async (
  app,
  { service },
) => {
  app.get(
    '/:id/stats',
    {
      schema: {
        tags: ['Stats'],
        summary: 'Get streaks, totals and yearly check-ins of a habit',
        description:
          'Streaks count scheduled days only. The 30-day rate starts no earlier than the day the habit was created.',
        params: idParams,
        querystring: statsQuery,
        response: { 200: habitStatsSchema, ...pickErrors(400, 404, 500) },
      },
    },
    async (request) => service.get(request.params.id, request.query),
  );
};
