import { z } from 'zod';
import { calendarDate } from '../../lib/schemas.js';

export const statsQuery = z.object({
  date: calendarDate.describe("Client's local date, used as today"),
  year: z
    .string()
    .regex(/^\d{4}$/, 'Expected a four-digit year')
    .transform(Number)
    .refine((year) => year >= 1970, 'Year must be 1970 or later')
    .optional()
    .describe('Heatmap year, defaults to the year of `date`')
    .meta({ example: '2026' }),
});

export const habitStatsSchema = z
  .object({
    dates: z.array(z.string()).describe('Check-in days within the requested year, ascending'),
    currentStreak: z.number().int(),
    bestStreak: z.number().int(),
    totalCheckins: z.number().int().describe('All-time number of check-ins'),
    completionRate30d: z
      .number()
      .min(0)
      .max(1)
      .describe('Share of scheduled days done over the last 30 days, two decimals'),
  })
  .meta({ id: 'HabitStats' });

export type StatsQuery = z.output<typeof statsQuery>;
export type HabitStatsDto = z.input<typeof habitStatsSchema>;
