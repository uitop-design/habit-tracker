import { z } from 'zod';
import { HABIT_COLORS, HABIT_NAME_MAX_LENGTH } from '../../domain/habit.js';
import { calendarDate, timestamp } from '../../lib/schemas.js';

export const habitColorSchema = z.enum(HABIT_COLORS).meta({ id: 'HabitColor' });

const weekday = z.number().int().min(1).max(7);

export const weekdaysSchema = z
  .array(weekday)
  .min(1)
  .max(7)
  .refine((days) => new Set(days).size === days.length, 'Weekdays must be unique')
  .transform((days) => [...days].sort((a, b) => a - b))
  .describe('ISO weekdays, 1 = Monday … 7 = Sunday; all seven means every day')
  .meta({ example: [1, 2, 3, 4, 5] });

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name must not be empty')
  .max(HABIT_NAME_MAX_LENGTH, `Name must be at most ${HABIT_NAME_MAX_LENGTH} characters`)
  .meta({ example: 'Read 20 pages' });

export const createHabitBody = z
  .strictObject({
    name: nameSchema,
    color: habitColorSchema,
    weekdays: weekdaysSchema,
  })
  .meta({ id: 'CreateHabit' });

export const updateHabitBody = z
  .strictObject({
    name: nameSchema.optional(),
    color: habitColorSchema.optional(),
    weekdays: weekdaysSchema.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  })
  .meta({ id: 'UpdateHabit' });

export const listHabitsQuery = z.object({
  date: calendarDate.describe("Client's local date, used as today"),
  archived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true')
    .describe('Return archived habits instead of active ones'),
});

export const habitSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    color: habitColorSchema,
    weekdays: z.array(z.number().int()),
    archivedAt: timestamp.nullable(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .meta({ id: 'Habit' });

export const habitWithProgressSchema = habitSchema
  .extend({
    scheduledToday: z.boolean(),
    doneToday: z.boolean(),
    currentStreak: z.number().int(),
    bestStreak: z.number().int(),
  })
  .meta({ id: 'HabitWithProgress' });

export const habitListSchema = z.array(habitWithProgressSchema);

export type CreateHabitInput = z.output<typeof createHabitBody>;
export type UpdateHabitInput = z.output<typeof updateHabitBody>;
export type ListHabitsQuery = z.output<typeof listHabitsQuery>;
export type HabitDto = z.input<typeof habitSchema>;
export type HabitWithProgressDto = z.input<typeof habitWithProgressSchema>;
