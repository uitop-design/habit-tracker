import { and, eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { checkins } from '../../db/schema.js';
import { addDays } from '../../domain/dates.js';
import {
  CHECKIN_FUTURE_DAYS,
  CHECKIN_PAST_DAYS,
  isCheckinDateAllowed,
} from '../../domain/habit.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from '../../lib/pg-errors.js';
import { findHabitOrThrow } from '../habits/queries.js';
import type { CheckinParams } from './schemas.js';

export function createCheckinsService(db: Database) {
  async function assertWritable({ id, date }: CheckinParams, today: string): Promise<void> {
    if (!isCheckinDateAllowed(date, today)) {
      const from = addDays(today, -CHECKIN_PAST_DAYS);
      const to = addDays(today, CHECKIN_FUTURE_DAYS);
      throw new BadRequestError(`Check-in date must be between ${from} and ${to}`);
    }
    const habit = await findHabitOrThrow(db, id);
    if (habit.archivedAt) {
      throw new ConflictError('Archived habits cannot be checked in or out');
    }
  }

  return {
    async add(params: CheckinParams, today: string): Promise<void> {
      await assertWritable(params, today);
      try {
        await db
          .insert(checkins)
          .values({ habitId: params.id, date: params.date })
          .onConflictDoNothing();
      } catch (error) {
        if (pgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) throw new NotFoundError('Habit');
        throw error;
      }
    },

    async remove(params: CheckinParams, today: string): Promise<void> {
      await assertWritable(params, today);
      await db
        .delete(checkins)
        .where(and(eq(checkins.habitId, params.id), eq(checkins.date, params.date)));
    },
  };
}

export type CheckinsService = ReturnType<typeof createCheckinsService>;
