import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { noContent, pickErrors } from '../../lib/schemas.js';
import { checkinParams, checkinQuery } from './schemas.js';
import type { CheckinsService } from './service.js';

const tags = ['Check-ins'];

export const checkinsRoutes: FastifyPluginAsyncZod<{ service: CheckinsService }> = async (
  app,
  { service },
) => {
  app.put(
    '/:id/checkins/:date',
    {
      schema: {
        tags,
        summary: 'Mark the habit done on a day',
        description: 'Idempotent. Days outside the schedule are allowed and do not affect streaks.',
        params: checkinParams,
        querystring: checkinQuery,
        response: { 204: noContent('Check-in saved'), ...pickErrors(400, 404, 409, 500) },
      },
    },
    async (request, reply) => {
      await service.add(request.params, request.query.today);
      return reply.status(204).send();
    },
  );

  app.delete(
    '/:id/checkins/:date',
    {
      schema: {
        tags,
        summary: 'Remove the check-in for a day',
        description: 'Idempotent: removing a missing check-in also returns 204.',
        params: checkinParams,
        querystring: checkinQuery,
        response: { 204: noContent('Check-in removed'), ...pickErrors(400, 404, 409, 500) },
      },
    },
    async (request, reply) => {
      await service.remove(request.params, request.query.today);
      return reply.status(204).send();
    },
  );
};
