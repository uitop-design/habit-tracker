import { z } from 'zod';

export const HABIT_COLORS = [
  'slate',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'blue',
  'violet',
  'pink',
] as const;

export const HABIT_NAME_MAX_LENGTH = 48;

export const habitColorSchema = z.enum(HABIT_COLORS);

export const habitSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: habitColorSchema,
  weekdays: z.array(z.number().int()),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const habitWithProgressSchema = habitSchema.extend({
  scheduledToday: z.boolean(),
  doneToday: z.boolean(),
  currentStreak: z.number().int(),
  bestStreak: z.number().int(),
});

export const habitListSchema = z.array(habitWithProgressSchema);

export const habitStatsSchema = z.object({
  dates: z.array(z.string()),
  currentStreak: z.number().int(),
  bestStreak: z.number().int(),
  totalCheckins: z.number().int(),
  completionRate30d: z.number(),
});

export const emptySchema = z.undefined();

export type HabitColor = z.infer<typeof habitColorSchema>;
export type Habit = z.infer<typeof habitSchema>;
export type HabitWithProgress = z.infer<typeof habitWithProgressSchema>;
export type HabitStats = z.infer<typeof habitStatsSchema>;

export interface HabitInput {
  name: string;
  color: HabitColor;
  weekdays: number[];
}
