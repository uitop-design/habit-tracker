import { addDays, format, parseISO } from 'date-fns';

export const CHECKIN_PAST_DAYS = 365;
export const CHECKIN_FUTURE_DAYS = 1;

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseDateKey(key: string): Date {
  return parseISO(key);
}

export function shiftDateKey(key: string, days: number): string {
  return toDateKey(addDays(parseDateKey(key), days));
}

export function isCheckinAllowed(date: string, today: string): boolean {
  return (
    date >= shiftDateKey(today, -CHECKIN_PAST_DAYS) &&
    date <= shiftDateKey(today, CHECKIN_FUTURE_DAYS)
  );
}

export function formatLongDate(key: string): string {
  return format(parseDateKey(key), 'EEEE, MMMM d');
}

export function formatShortDate(key: string): string {
  return format(parseDateKey(key), 'EEE, MMM d, yyyy');
}
