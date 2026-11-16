import { addDays, differenceInCalendarDays, endOfWeek, startOfWeek } from 'date-fns';
import { toDateKey } from '@/lib/dates';

export interface HeatmapCell {
  date: string;
  inYear: boolean;
}

export interface HeatmapMonthLabel {
  label: string;
  column: number;
}

export interface HeatmapGrid {
  weeks: HeatmapCell[][];
  months: HeatmapMonthLabel[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildYearGrid(year: number): HeatmapGrid {
  const first = new Date(year, 0, 1);
  const start = startOfWeek(first, { weekStartsOn: 1 });
  const end = endOfWeek(new Date(year, 11, 31), { weekStartsOn: 1 });
  const totalWeeks = (differenceInCalendarDays(end, start) + 1) / 7;

  const weeks = Array.from({ length: totalWeeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = addDays(start, week * 7 + weekday);
      return { date: toDateKey(day), inYear: day.getFullYear() === year };
    }),
  );

  const months = MONTHS.map((label, month) => ({
    label,
    column: Math.floor(differenceInCalendarDays(new Date(year, month, 1), start) / 7),
  }));

  return { weeks, months };
}
