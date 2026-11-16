const MS_PER_DAY = 86_400_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DayNumber = number;

export function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function toDayNumber(value: string): DayNumber {
  if (!isCalendarDate(value)) {
    throw new RangeError(`Invalid calendar date: ${value}`);
  }
  return Date.parse(`${value}T00:00:00Z`) / MS_PER_DAY;
}

export function fromDayNumber(day: DayNumber): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return fromDayNumber(toDayNumber(value) + days);
}

export function isoWeekday(day: DayNumber): number {
  return ((((day + 3) % 7) + 7) % 7) + 1;
}

export function utcDateOf(timestamp: Date): string {
  return timestamp.toISOString().slice(0, 10);
}
