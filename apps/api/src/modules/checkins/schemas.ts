import { z } from 'zod';
import { calendarDate } from '../../lib/schemas.js';

export const checkinParams = z.object({
  id: z.uuid().describe('Habit id'),
  date: calendarDate.describe('Day to check in, YYYY-MM-DD'),
});

export const checkinQuery = z.object({
  today: calendarDate.describe(
    "Client's local date; check-ins are allowed from today − 365 to today + 1 days",
  ),
});

export type CheckinParams = z.output<typeof checkinParams>;
