import { asc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { checkins, type HabitRow, habits } from '../../db/schema.js';
import { utcDateOf } from '../../domain/dates.js';
import { NotFoundError } from '../../lib/errors.js';
import type { HabitDto } from './schemas.js';

export async function findHabitOrThrow(db: Database, id: string): Promise<HabitRow> {
  const [habit] = await db.select().from(habits).where(eq(habits.id, id)).limit(1);
  if (!habit) {
    throw new NotFoundError('Habit');
  }
  return habit;
}

export async function loadCheckinDates(
  db: Database,
  habitIds: readonly string[],
): Promise<Map<string, string[]>> {
  const byHabit = new Map<string, string[]>(habitIds.map((id) => [id, []]));
  if (habitIds.length === 0) return byHabit;

  const rows = await db
    .select({ habitId: checkins.habitId, date: checkins.date })
    .from(checkins)
    .where(inArray(checkins.habitId, [...habitIds]))
    .orderBy(asc(checkins.date));

  for (const row of rows) {
    byHabit.get(row.habitId)?.push(row.date);
  }
  return byHabit;
}

export function trackingStartDate(habit: HabitRow, dates: readonly string[]): string {
  const created = utcDateOf(habit.createdAt);
  const first = dates[0];
  return first !== undefined && first < created ? first : created;
}

export function toHabitDto(habit: HabitRow): HabitDto {
  return {
    id: habit.id,
    name: habit.name,
    color: habit.color,
    weekdays: habit.weekdays,
    archivedAt: habit.archivedAt?.toISOString() ?? null,
    createdAt: habit.createdAt.toISOString(),
    updatedAt: habit.updatedAt.toISOString(),
  };
}
