import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { idParams, noContent, pickErrors, todayQuery } from '../../lib/schemas.js';
import {
  createHabitBody,
  habitListSchema,
  habitSchema,
  habitWithProgressSchema,
  listHabitsQuery,
  updateHabitBody,
} from './schemas.js';
import type { HabitsService } from './service.js';

const tags = ['Habits'];

export const habitsRoutes: FastifyPluginAsyncZod<{ service: HabitsService }> = async (
  app,
  { service },
) => {
  app.post(
    '/',
    {
      schema: {
        tags,
        summary: 'Create a habit',
        description: 'Names are unique among active habits, case-insensitively.',
        body: createHabitBody,
        response: { 201: habitSchema, ...pickErrors(400, 409, 500) },
      },
    },
    async (request, reply) => reply.status(201).send(await service.create(request.body)),
  );

  app.get(
    '/',
    {
      schema: {
        tags,
        summary: 'List habits with progress for the given day',
        querystring: listHabitsQuery,
        response: { 200: habitListSchema, ...pickErrors(400, 500) },
      },
    },
    async (request) => service.list(request.query),
  );

  app.get(
    '/:id',
    {
      schema: {
        tags,
        summary: 'Get a habit with progress for the given day',
        params: idParams,
        querystring: todayQuery,
        response: { 200: habitWithProgressSchema, ...pickErrors(400, 404, 500) },
      },
    },
    async (request) => service.get(request.params.id, request.query.date),
  );

  app.patch(
    '/:id',
    {
      schema: {
        tags,
        summary: 'Update name, color or schedule',
        params: idParams,
        body: updateHabitBody,
        response: { 200: habitSchema, ...pickErrors(400, 404, 409, 500) },
      },
    },
    async (request) => service.update(request.params.id, request.body),
  );

  app.post(
    '/:id/archive',
    {
      schema: {
        tags,
        summary: 'Archive a habit',
        description: 'Archived habits keep their history but cannot be checked in. Idempotent.',
        params: idParams,
        response: { 200: habitSchema, ...pickErrors(400, 404, 500) },
      },
    },
    async (request) => service.archive(request.params.id),
  );

  app.post(
    '/:id/unarchive',
    {
      schema: {
        tags,
        summary: 'Restore an archived habit',
        description: 'Fails with 409 if an active habit already uses the same name. Idempotent.',
        params: idParams,
        response: { 200: habitSchema, ...pickErrors(400, 404, 409, 500) },
      },
    },
    async (request) => service.unarchive(request.params.id),
  );

  app.delete(
    '/:id',
    {
      schema: {
        tags,
        summary: 'Delete a habit with all its check-ins',
        params: idParams,
        response: { 204: noContent('Habit deleted'), ...pickErrors(400, 404, 500) },
      },
    },
    async (request, reply) => {
      await service.remove(request.params.id);
      return reply.status(204).send();
    },
  );
};
