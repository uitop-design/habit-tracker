import type { HabitColor } from '@/api/schemas';

export const COLOR_CLASSES: Record<HabitColor, string> = {
  slate: 'bg-slate-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
};

export const WEEKDAYS = [
  { value: 1, short: 'Mo', long: 'Monday' },
  { value: 2, short: 'Tu', long: 'Tuesday' },
  { value: 3, short: 'We', long: 'Wednesday' },
  { value: 4, short: 'Th', long: 'Thursday' },
  { value: 5, short: 'Fr', long: 'Friday' },
  { value: 6, short: 'Sa', long: 'Saturday' },
  { value: 7, short: 'Su', long: 'Sunday' },
] as const;

export const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];
export const WORKDAYS = [1, 2, 3, 4, 5];

const sameDays = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((day, index) => day === b[index]);

export function describeSchedule(weekdays: readonly number[]): string {
  const sorted = [...weekdays].sort((a, b) => a - b);
  if (sameDays(sorted, EVERY_DAY)) return 'Every day';
  if (sameDays(sorted, WORKDAYS)) return 'Weekdays';
  if (sameDays(sorted, [6, 7])) return 'Weekends';
  return WEEKDAYS.filter((day) => sorted.includes(day.value))
    .map((day) => day.short)
    .join(', ');
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
