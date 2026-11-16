import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { type HabitRow, habits } from '../../db/schema.js';
import { habitProgress } from '../../domain/streaks.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/pg-errors.js';
import { findHabitOrThrow, loadCheckinDates, toHabitDto } from './queries.js';
import type {
  CreateHabitInput,
  HabitDto,
  HabitWithProgressDto,
  ListHabitsQuery,
  UpdateHabitInput,
} from './schemas.js';

function duplicateName(name: string): ConflictError {
  return new ConflictError(`An active habit named "${name}" already exists`);
}

export function createHabitsService(db: Database) {
  async function withProgress(rows: HabitRow[], today: string): Promise<HabitWithProgressDto[]> {
    const datesByHabit = await loadCheckinDates(
      db,
      rows.map((habit) => habit.id),
    );
    return rows.map((habit) => ({
      ...toHabitDto(habit),
      ...habitProgress({
        dates: datesByHabit.get(habit.id) ?? [],
        weekdays: habit.weekdays,
        today,
      }),
    }));
  }

  return {
    async list({ date, archived }: ListHabitsQuery): Promise<HabitWithProgressDto[]> {
      const rows = await db
        .select()
        .from(habits)
        .where(archived ? isNotNull(habits.archivedAt) : isNull(habits.archivedAt))
        .orderBy(
          archived ? desc(habits.archivedAt) : asc(habits.createdAt),
          asc(habits.name),
          asc(habits.id),
        );
      return withProgress(rows, date);
    },

    async get(id: string, date: string): Promise<HabitWithProgressDto> {
      const habit = await findHabitOrThrow(db, id);
      const [result] = await withProgress([habit], date);
      return result as HabitWithProgressDto;
    },

    async create(input: CreateHabitInput): Promise<HabitDto> {
      try {
        const [habit] = await db.insert(habits).values(input).returning();
        return toHabitDto(habit as HabitRow);
      } catch (error) {
        if (isUniqueViolation(error)) throw duplicateName(input.name);
        throw error;
      }
    },

    async update(id: string, input: UpdateHabitInput): Promise<HabitDto> {
      try {
        const [habit] = await db.update(habits).set(input).where(eq(habits.id, id)).returning();
        if (!habit) throw new NotFoundError('Habit');
        return toHabitDto(habit);
      } catch (error) {
        if (isUniqueViolation(error) && input.name !== undefined) throw duplicateName(input.name);
        throw error;
      }
    },

    async archive(id: string): Promise<HabitDto> {
      const [habit] = await db
        .update(habits)
        .set({ archivedAt: new Date() })
        .where(and(eq(habits.id, id), isNull(habits.archivedAt)))
        .returning();
      return toHabitDto(habit ?? (await findHabitOrThrow(db, id)));
    },

    async unarchive(id: string): Promise<HabitDto> {
      try {
        const [habit] = await db
          .update(habits)
          .set({ archivedAt: null })
          .where(and(eq(habits.id, id), isNotNull(habits.archivedAt)))
          .returning();
        return toHabitDto(habit ?? (await findHabitOrThrow(db, id)));
      } catch (error) {
        if (isUniqueViolation(error)) {
          const habit = await findHabitOrThrow(db, id);
          throw duplicateName(habit.name);
        }
        throw error;
      }
    },

    async remove(id: string): Promise<void> {
      const deleted = await db.delete(habits).where(eq(habits.id, id)).returning({ id: habits.id });
      if (deleted.length === 0) throw new NotFoundError('Habit');
    },
  };
}

export type HabitsService = ReturnType<typeof createHabitsService>;
