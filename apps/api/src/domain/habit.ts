import { toDayNumber } from './dates.js';

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

export type HabitColor = (typeof HABIT_COLORS)[number];

export const HABIT_NAME_MAX_LENGTH = 48;

export const CHECKIN_PAST_DAYS = 365;
export const CHECKIN_FUTURE_DAYS = 1;

export function isCheckinDateAllowed(date: string, today: string): boolean {
  const offset = toDayNumber(date) - toDayNumber(today);
  return offset >= -CHECKIN_PAST_DAYS && offset <= CHECKIN_FUTURE_DAYS;
}
