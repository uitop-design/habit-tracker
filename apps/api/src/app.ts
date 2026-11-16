import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Database } from './db/client.js';
import { checkinsRoutes } from './modules/checkins/routes.js';
import { createCheckinsService } from './modules/checkins/service.js';
import { habitsRoutes } from './modules/habits/routes.js';
import { createHabitsService } from './modules/habits/service.js';
import { healthRoutes } from './modules/health/routes.js';
import { createHealthService } from './modules/health/service.js';
import dbPlugin from './plugins/db.js';
import errorHandler from './plugins/error-handler.js';
import swagger from './plugins/swagger.js';

export const BODY_LIMIT_BYTES = 64 * 1024;

export interface BuildAppOptions {
  db: Database;
  closeDb?: () => Promise<void>;
  logger?: FastifyBaseLogger;
}

export async function buildApp({ db, closeDb, logger }: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    ...(logger ? { loggerInstance: logger } : { logger: false }),
    bodyLimit: BODY_LIMIT_BYTES,
    routerOptions: { ignoreTrailingSlash: true },
  }).withTypeProvider<ZodTypeProvider>();

  app.removeContentTypeParser('text/plain');
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorHandler);
  await app.register(swagger);
  await app.register(dbPlugin, { db, ...(closeDb ? { close: closeDb } : {}) });

  await app.register(
    async (api) => {
      await api.register(habitsRoutes, {
        prefix: '/habits',
        service: createHabitsService(api.db),
      });
      await api.register(checkinsRoutes, {
        prefix: '/habits',
        service: createCheckinsService(api.db),
      });
      await api.register(healthRoutes, {
        prefix: '/health',
        service: createHealthService(api.db),
      });
    },
    { prefix: '/api' },
  );

  return app;
}
