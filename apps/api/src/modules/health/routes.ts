import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { HealthService } from './service.js';

const healthSchema = z
  .object({
    status: z.enum(['ok', 'error']),
    checks: z.object({ postgres: z.enum(['up', 'down']) }),
  })
  .meta({ id: 'Health' });

export const healthRoutes: FastifyPluginAsyncZod<{ service: HealthService }> = async (
  app,
  { service },
) => {
  app.get(
    '/',
    {
      schema: {
        tags: ['Health'],
        summary: 'Check database connectivity',
        response: { 200: healthSchema, 503: healthSchema },
      },
    },
    async (_request, reply) => {
      const report = await service.check();
      return reply.status(report.status === 'ok' ? 200 : 503).send(report);
    },
  );
};
