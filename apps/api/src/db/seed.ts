import { loadConfig, loadEnvFile } from '../config.js';
import { addDays, isoWeekday, toDayNumber } from '../domain/dates.js';
import type { HabitColor } from '../domain/habit.js';
import { createLogger } from '../lib/logger.js';
import { createDatabase } from './client.js';
import { checkins, habits } from './schema.js';

const HISTORY_DAYS = 150;
const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];

interface SeedHabit {
  id: string;
  name: string;
  color: HabitColor;
  weekdays: number[];
  completion: number;
  recentRun: number;
  doneToday: boolean;
  offScheduleChance: number;
  archivedDaysAgo?: number;
}

const SEED_HABITS: SeedHabit[] = [
  {
    id: '0b6f3c1e-8a52-4d7e-9f10-2c4a6e8b1d01',
    name: 'Drink 2 liters of water',
    color: 'blue',
    weekdays: EVERY_DAY,
    completion: 0.9,
    recentRun: 23,
    doneToday: false,
    offScheduleChance: 0,
  },
  {
    id: '0b6f3c1e-8a52-4d7e-9f10-2c4a6e8b1d02',
    name: 'Morning run',
    color: 'orange',
    weekdays: [1, 3, 5],
    completion: 0.8,
    recentRun: 6,
    doneToday: true,
    offScheduleChance: 0.15,
  },
  {
    id: '0b6f3c1e-8a52-4d7e-9f10-2c4a6e8b1d03',
    name: 'Read 20 pages',
    color: 'violet',
    weekdays: EVERY_DAY,
    completion: 0.7,
    recentRun: 4,
    doneToday: true,
    offScheduleChance: 0,
  },
  {
    id: '0b6f3c1e-8a52-4d7e-9f10-2c4a6e8b1d04',
    name: 'Meditate',
    color: 'teal',
    weekdays: [1, 2, 3, 4, 5],
    completion: 0.85,
    recentRun: 12,
    doneToday: false,
    offScheduleChance: 0.2,
  },
  {
    id: '0b6f3c1e-8a52-4d7e-9f10-2c4a6e8b1d05',
    name: 'Practice guitar',
    color: 'pink',
    weekdays: [2, 4, 6],
    completion: 0.6,
    recentRun: 0,
    doneToday: false,
    offScheduleChance: 0.1,
    archivedDaysAgo: 21,
  },
];

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function buildHistory(habit: SeedHabit, today: string, index: number): string[] {
  const random = createRandom(index * 7919 + 17);
  const lastDay = habit.archivedDaysAgo ?? 0;
  const dates: string[] = [];
  let recentScheduled = 0;

  for (let offset = lastDay; offset < HISTORY_DAYS; offset += 1) {
    const date = addDays(today, -offset);
    const scheduled = habit.weekdays.includes(isoWeekday(toDayNumber(date)));
    const roll = random();

    if (offset === 0) {
      if (habit.doneToday) dates.push(date);
      continue;
    }
    if (!scheduled) {
      if (roll < habit.offScheduleChance) dates.push(date);
      continue;
    }
    recentScheduled += 1;
    if (recentScheduled <= habit.recentRun) {
      dates.push(date);
    } else if (recentScheduled === habit.recentRun + 1) {
      continue;
    } else if (roll < habit.completion) {
      dates.push(date);
    }
  }
  return dates.reverse();
}

loadEnvFile();
const config = loadConfig();
const logger = createLogger(config, 'seed');
const { db, pool } = createDatabase(config.DATABASE_URL);

try {
  const today = localToday();
  const startedAt = new Date(`${addDays(today, -HISTORY_DAYS)}T08:00:00Z`);

  const inserted = await db.transaction(async (tx) => {
    const created = await tx
      .insert(habits)
      .values(
        SEED_HABITS.map((habit) => ({
          id: habit.id,
          name: habit.name,
          color: habit.color,
          weekdays: habit.weekdays,
          createdAt: startedAt,
          updatedAt: startedAt,
          archivedAt:
            habit.archivedDaysAgo === undefined
              ? null
              : new Date(`${addDays(today, -habit.archivedDaysAgo)}T20:00:00Z`),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: habits.id });

    const createdIds = new Set(created.map((row) => row.id));
    const rows = SEED_HABITS.flatMap((habit, index) =>
      createdIds.has(habit.id)
        ? buildHistory(habit, today, index).map((date) => ({ habitId: habit.id, date }))
        : [],
    );
    if (rows.length > 0) {
      await tx.insert(checkins).values(rows).onConflictDoNothing();
    }
    return { habits: created.length, checkins: rows.length };
  });

  if (inserted.habits === 0) {
    logger.info('Seed data already present, nothing to do');
  } else {
    logger.info(inserted, 'Seed data inserted');
  }
} catch (error) {
  logger.error({ err: error }, 'Seed failed');
  process.exitCode = 1;
} finally {
  await pool.end();
}
