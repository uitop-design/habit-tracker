import { describe, expect, it } from 'vitest';
import { addDays } from '../src/domain/dates.js';
import {
  bestStreak,
  completionRate,
  currentStreak,
  habitProgress,
  isScheduled,
} from '../src/domain/streaks.js';

const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];
const WEEKDAYS = [1, 2, 3, 4, 5];
const MON_WED_FRI = [1, 3, 5];
const TODAY = '2026-11-16';

const daysBack = (from: number, to: number, today = TODAY) =>
  Array.from({ length: from - to + 1 }, (_, index) => addDays(today, -(from - index)));

const streaks = (dates: string[], weekdays: number[], today = TODAY) => ({
  current: currentStreak({ dates, weekdays, today }),
  best: bestStreak({ dates, weekdays, today }),
});

describe('currentStreak and bestStreak', () => {
  it('counts consecutive days for a daily habit', () => {
    expect(streaks(daysBack(4, 0), EVERY_DAY)).toEqual({ current: 5, best: 5 });
  });

  it('returns zero without check-ins', () => {
    expect(streaks([], EVERY_DAY)).toEqual({ current: 0, best: 0 });
  });

  it('does not break the streak when today is scheduled but not checked yet', () => {
    expect(streaks(daysBack(3, 1), EVERY_DAY)).toEqual({ current: 3, best: 3 });
  });

  it('breaks the streak when yesterday was missed', () => {
    expect(streaks(daysBack(5, 2), EVERY_DAY)).toEqual({ current: 0, best: 4 });
  });

  it('breaks the streak on a missed scheduled day', () => {
    const dates = [addDays(TODAY, -3), addDays(TODAY, -1), TODAY];
    expect(streaks(dates, EVERY_DAY)).toEqual({ current: 2, best: 2 });
  });

  it('lets weekends pass for a weekdays habit', () => {
    const dates = ['2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
    expect(streaks([...dates, '2026-11-13', TODAY], WEEKDAYS)).toEqual({ current: 7, best: 7 });
  });

  it('ignores check-ins on unscheduled days', () => {
    const scheduled = ['2026-11-11', '2026-11-13', TODAY];
    const withWeekend = [...scheduled, '2026-11-14', '2026-11-15'];
    expect(streaks(withWeekend, MON_WED_FRI)).toEqual(streaks(scheduled, MON_WED_FRI));
    expect(streaks(withWeekend, MON_WED_FRI)).toEqual({ current: 3, best: 3 });
  });

  it('returns zero when only unscheduled days are checked', () => {
    expect(streaks(['2026-11-14', '2026-11-15'], MON_WED_FRI)).toEqual({ current: 0, best: 0 });
  });

  it('keeps the streak when today is not scheduled', () => {
    expect(streaks(['2026-11-10', '2026-11-12'], [2, 4])).toEqual({ current: 2, best: 2 });
  });

  it('finds the best streak in the past', () => {
    const dates = [...daysBack(40, 34), addDays(TODAY, -1), TODAY];
    expect(streaks(dates, EVERY_DAY)).toEqual({ current: 2, best: 7 });
  });

  it('ignores check-ins after today', () => {
    const dates = [TODAY, addDays(TODAY, 1)];
    expect(streaks(dates, EVERY_DAY)).toEqual({ current: 1, best: 1 });
  });

  it('continues across the year boundary', () => {
    const dates = ['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02'];
    expect(streaks(dates, EVERY_DAY, '2026-01-02')).toEqual({ current: 4, best: 4 });
  });

  it('counts February 29 in a leap year', () => {
    const dates = ['2024-02-28', '2024-02-29', '2024-03-01'];
    expect(streaks(dates, EVERY_DAY, '2024-03-01')).toEqual({ current: 3, best: 3 });
  });

  it('does not expect February 29 in a common year', () => {
    const dates = ['2025-02-27', '2025-02-28', '2025-03-01'];
    expect(streaks(dates, EVERY_DAY, '2025-03-01')).toEqual({ current: 3, best: 3 });
  });

  it('handles a weekly habit across the year boundary', () => {
    const dates = ['2025-12-22', '2025-12-29', '2026-01-05'];
    expect(streaks(dates, [1], '2026-01-07')).toEqual({ current: 3, best: 3 });
  });

  it('stays fast for check-ins far apart', () => {
    const dates = ['2026-11-16', '9999-12-30'];
    expect(streaks(dates, [1, 3], '9999-12-31')).toEqual({ current: 0, best: 1 });
  });
});

describe('completionRate', () => {
  it('is the share of checked scheduled days in the last 30 days', () => {
    const everyOtherDay = daysBack(29, 0).filter((_, index) => index % 2 === 0);
    expect(completionRate({ dates: everyOtherDay, weekdays: EVERY_DAY, today: TODAY })).toBe(0.5);
  });

  it('is 1 when every scheduled day is checked', () => {
    expect(completionRate({ dates: daysBack(29, 0), weekdays: EVERY_DAY, today: TODAY })).toBe(1);
  });

  it('counts only scheduled days', () => {
    const dates = daysBack(29, 0).filter((date) => isScheduled(MON_WED_FRI, date));
    expect(completionRate({ dates, weekdays: MON_WED_FRI, today: TODAY })).toBe(1);
  });

  it('includes today and ignores older check-ins', () => {
    const dates = [...daysBack(60, 30), TODAY];
    expect(completionRate({ dates, weekdays: EVERY_DAY, today: TODAY })).toBe(0.03);
  });

  it('rounds to two decimals', () => {
    const dates = daysBack(29, 0).slice(0, 20);
    expect(completionRate({ dates, weekdays: EVERY_DAY, today: TODAY })).toBe(0.67);
  });

  it('starts the window at the start date', () => {
    const dates = daysBack(9, 5);
    const rate = completionRate({
      dates,
      weekdays: EVERY_DAY,
      today: TODAY,
      startDate: addDays(TODAY, -9),
    });
    expect(rate).toBe(0.5);
  });

  it('never starts the window after today', () => {
    const rate = completionRate({
      dates: [TODAY],
      weekdays: EVERY_DAY,
      today: TODAY,
      startDate: addDays(TODAY, 1),
    });
    expect(rate).toBe(1);
  });

  it('is 0 when nothing is scheduled in the window', () => {
    const rate = completionRate({
      dates: [TODAY],
      weekdays: [2],
      today: TODAY,
      startDate: TODAY,
    });
    expect(rate).toBe(0);
  });
});

describe('habitProgress', () => {
  it('reports today flags along with streaks', () => {
    expect(
      habitProgress({ dates: ['2026-11-14', TODAY], weekdays: MON_WED_FRI, today: TODAY }),
    ).toEqual({ scheduledToday: true, doneToday: true, currentStreak: 1, bestStreak: 1 });
    expect(habitProgress({ dates: [], weekdays: [2], today: TODAY })).toEqual({
      scheduledToday: false,
      doneToday: false,
      currentStreak: 0,
      bestStreak: 0,
    });
  });
});
