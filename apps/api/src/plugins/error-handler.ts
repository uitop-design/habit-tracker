import { STATUS_CODES } from 'node:http';
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import { AppError } from '../lib/errors.js';
import {
  PG_CHECK_VIOLATION,
  PG_FOREIGN_KEY_VIOLATION,
  PG_INVALID_TEXT_REPRESENTATION,
  PG_UNIQUE_VIOLATION,
  pgErrorCode,
} from '../lib/pg-errors.js';

export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

const PG_ERRORS: Record<string, { statusCode: number; message: string }> = {
  [PG_UNIQUE_VIOLATION]: { statusCode: 409, message: 'Resource already exists' },
  [PG_FOREIGN_KEY_VIOLATION]: { statusCode: 400, message: 'Referenced resource does not exist' },
  [PG_INVALID_TEXT_REPRESENTATION]: { statusCode: 400, message: 'Invalid input syntax' },
  [PG_CHECK_VIOLATION]: { statusCode: 400, message: 'Value violates a data constraint' },
};

function errorBody(
  statusCode: number,
  message: string | string[],
  request: FastifyRequest,
): ErrorBody {
  return {
    statusCode,
    error: STATUS_CODES[statusCode] ?? 'Error',
    message,
    path: request.url,
    timestamp: new Date().toISOString(),
  };
}

function formatPath(instancePath: string, context: string | undefined): string {
  const scope = context === 'querystring' ? 'query' : (context ?? 'request');
  const segments = instancePath.split('/').filter(Boolean);
  return [scope, ...segments].join('.');
}

export function resolveError(error: FastifyError | Error, request: FastifyRequest): ErrorBody {
  if (hasZodFastifySchemaValidationErrors(error)) {
    const messages = error.validation.map(
      (issue) => `${formatPath(issue.instancePath, error.validationContext)}: ${issue.message}`,
    );
    return errorBody(400, messages, request);
  }

  if (error instanceof AppError) {
    return errorBody(error.statusCode, error.message, request);
  }

  const pgCode = pgErrorCode(error);
  const pgError = pgCode ? PG_ERRORS[pgCode] : undefined;
  if (pgError) {
    return errorBody(pgError.statusCode, pgError.message, request);
  }

  const statusCode = (error as FastifyError).statusCode;
  if (
    !isResponseSerializationError(error) &&
    typeof statusCode === 'number' &&
    statusCode >= 400 &&
    statusCode < 500
  ) {
    return errorBody(statusCode, error.message, request);
  }

  return errorBody(500, 'Internal Server Error', request);
}

async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const payload = resolveError(error, request);
    if (payload.statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled error');
    } else {
      request.log.info(
        { statusCode: payload.statusCode, reason: payload.message },
        'Request rejected',
      );
    }
    return reply.status(payload.statusCode).send(payload);
  });

  app.setNotFoundHandler((request, reply) => {
    const path = request.url.split('?')[0];
    return reply
      .status(404)
      .send(errorBody(404, `Route ${request.method} ${path} not found`, request));
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
