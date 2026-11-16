import type { Database } from '../../db/client.js';
import { bestStreak, completionRate, currentStreak } from '../../domain/streaks.js';
import { findHabitOrThrow, loadCheckinDates, trackingStartDate } from '../habits/queries.js';
import type { HabitStatsDto, StatsQuery } from './schemas.js';

export function createStatsService(db: Database) {
  return {
    async get(id: string, { date, year }: StatsQuery): Promise<HabitStatsDto> {
      const habit = await findHabitOrThrow(db, id);
      const dates = (await loadCheckinDates(db, [id])).get(id) ?? [];
      const yearPrefix = `${year ?? date.slice(0, 4)}-`;
      const input = { dates, weekdays: habit.weekdays, today: date };

      return {
        dates: dates.filter((day) => day.startsWith(yearPrefix)),
        currentStreak: currentStreak(input),
        bestStreak: bestStreak(input),
        totalCheckins: dates.length,
        completionRate30d: completionRate({
          ...input,
          startDate: trackingStartDate(habit, dates),
        }),
      };
    },
  };
}

export type StatsService = ReturnType<typeof createStatsService>;
