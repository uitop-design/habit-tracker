import { describe, expect, it } from 'vitest';
import { addDays, isCalendarDate, isoWeekday, toDayNumber } from '../src/domain/dates.js';
import { isCheckinDateAllowed } from '../src/domain/habit.js';
import { calendarDate } from '../src/lib/schemas.js';

describe('isCalendarDate', () => {
  it.each(['2026-11-16', '2024-02-29', '2000-02-29', '2026-12-31', '0050-03-01', '9999-12-31'])(
    'accepts %s',
    (value) => {
      expect(isCalendarDate(value)).toBe(true);
    },
  );

  it.each([
    '2026-02-30',
    '2025-02-29',
    '1900-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-1-5',
    '20261116',
    '2026-11-16T00:00',
    '',
    'abc',
  ])('rejects %s', (value) => {
    expect(isCalendarDate(value)).toBe(false);
  });
});

describe('date arithmetic', () => {
  it('adds days across month, year and leap boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
    expect(addDays('2026-03-01', -365)).toBe('2025-03-01');
  });

  it('returns ISO weekdays', () => {
    expect(isoWeekday(toDayNumber('2026-11-16'))).toBe(1);
    expect(isoWeekday(toDayNumber('2026-11-22'))).toBe(7);
    expect(isoWeekday(toDayNumber('1970-01-01'))).toBe(4);
    expect(isoWeekday(toDayNumber('1969-12-29'))).toBe(1);
  });

  it('throws for invalid dates', () => {
    expect(() => toDayNumber('2026-02-30')).toThrow(RangeError);
  });
});

describe('calendarDate schema', () => {
  it('accepts a valid date', () => {
    expect(calendarDate.safeParse('2026-11-16').success).toBe(true);
  });

  it('reports a single format error for malformed values', () => {
    const result = calendarDate.safeParse('2026-1-5');
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Expected a date in YYYY-MM-DD format',
    ]);
  });

  it('reports an impossible date', () => {
    const result = calendarDate.safeParse('2026-02-30');
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Expected a valid calendar date',
    ]);
  });

  it.each([null, 20261116, undefined])('rejects %s', (value) => {
    expect(calendarDate.safeParse(value).success).toBe(false);
  });
});

describe('isCheckinDateAllowed', () => {
  const today = '2026-11-16';

  it('allows a range from 365 days back to one day ahead', () => {
    expect(isCheckinDateAllowed(today, today)).toBe(true);
    expect(isCheckinDateAllowed('2025-11-16', today)).toBe(true);
    expect(isCheckinDateAllowed('2026-11-17', today)).toBe(true);
  });

  it('rejects dates outside the range', () => {
    expect(isCheckinDateAllowed('2025-11-15', today)).toBe(false);
    expect(isCheckinDateAllowed('2026-11-18', today)).toBe(false);
  });

  it('counts the leap day as one of the 365 days', () => {
    expect(isCheckinDateAllowed('2024-02-29', '2025-02-28')).toBe(true);
    expect(isCheckinDateAllowed('2024-02-28', '2025-02-28')).toBe(false);
  });
});
