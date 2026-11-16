import { z } from 'zod';
import { isCalendarDate } from '../domain/dates.js';

export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD format')
  .refine(isCalendarDate, 'Expected a valid calendar date')
  .meta({ format: 'date', example: '2026-11-16' });

export const todayQuery = z.object({
  date: calendarDate.describe("Client's local date, used as today"),
});

export const timestamp = z.iso.datetime().meta({ example: '2026-11-16T10:00:00.000Z' });

export const idParams = z.object({
  id: z.uuid().describe('Habit id'),
});

export const noContent = (description: string) => z.undefined().describe(description);

export const errorResponse = z
  .object({
    statusCode: z.number().int(),
    error: z.string(),
    message: z.union([z.string(), z.array(z.string())]),
    path: z.string(),
    timestamp: z.iso.datetime(),
  })
  .meta({ id: 'ErrorResponse', description: 'Error payload shared by all endpoints' });

const errorResponses = {
  400: errorResponse.describe('Invalid request'),
  404: errorResponse.describe('Resource not found'),
  409: errorResponse.describe('Conflict with the current state'),
  500: errorResponse.describe('Unexpected server error'),
} as const;

export const pickErrors = <K extends keyof typeof errorResponses>(...codes: K[]) =>
  Object.fromEntries(codes.map((code) => [code, errorResponses[code]])) as Pick<
    typeof errorResponses,
    K
  >;
