import { type DayNumber, isoWeekday, toDayNumber } from './dates.js';

export const COMPLETION_WINDOW_DAYS = 30;

export interface StreakInput {
  dates: readonly string[];
  weekdays: readonly number[];
  today: string;
}

export interface CompletionInput extends StreakInput {
  startDate?: string;
}

export interface HabitProgress {
  scheduledToday: boolean;
  doneToday: boolean;
  currentStreak: number;
  bestStreak: number;
}

function toDaySet(dates: readonly string[]): Set<DayNumber> {
  return new Set(dates.map(toDayNumber));
}

function minOf(days: Iterable<DayNumber>): DayNumber {
  let min = Number.POSITIVE_INFINITY;
  for (const day of days) {
    if (day < min) min = day;
  }
  return min;
}

export function isScheduled(weekdays: readonly number[], date: string): boolean {
  return weekdays.includes(isoWeekday(toDayNumber(date)));
}

export function currentStreak({ dates, weekdays, today }: StreakInput): number {
  const done = toDaySet(dates);
  const scheduled = new Set(weekdays);
  if (done.size === 0 || scheduled.size === 0) return 0;

  const earliest = minOf(done);
  let day = toDayNumber(today);
  if (!done.has(day)) day -= 1;

  let streak = 0;
  for (; day >= earliest; day -= 1) {
    if (!scheduled.has(isoWeekday(day))) continue;
    if (!done.has(day)) break;
    streak += 1;
  }
  return streak;
}

function hasScheduledDayBetween(from: DayNumber, to: DayNumber, scheduled: Set<number>): boolean {
  if (to - from > 7) return true;
  for (let day = from + 1; day < to; day += 1) {
    if (scheduled.has(isoWeekday(day))) return true;
  }
  return false;
}

export function bestStreak({ dates, weekdays, today }: StreakInput): number {
  const end = toDayNumber(today);
  const scheduled = new Set(weekdays);
  const days = [...toDaySet(dates)]
    .filter((day) => day <= end && scheduled.has(isoWeekday(day)))
    .sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  let previous: DayNumber | undefined;
  for (const day of days) {
    const continues = previous !== undefined && !hasScheduledDayBetween(previous, day, scheduled);
    run = continues ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }
  return best;
}

export function completionRate({ dates, weekdays, today, startDate }: CompletionInput): number {
  const done = toDaySet(dates);
  const scheduled = new Set(weekdays);
  const end = toDayNumber(today);
  let start = end - COMPLETION_WINDOW_DAYS + 1;
  if (startDate !== undefined) {
    start = Math.max(start, Math.min(toDayNumber(startDate), end));
  }

  let planned = 0;
  let completed = 0;
  for (let day = start; day <= end; day += 1) {
    if (!scheduled.has(isoWeekday(day))) continue;
    planned += 1;
    if (done.has(day)) completed += 1;
  }
  return planned === 0 ? 0 : Math.round((completed / planned) * 100) / 100;
}

export function habitProgress(input: StreakInput): HabitProgress {
  return {
    scheduledToday: isScheduled(input.weekdays, input.today),
    doneToday: input.dates.includes(input.today),
    currentStreak: currentStreak(input),
    bestStreak: bestStreak(input),
  };
}
