import { sql } from 'drizzle-orm';
import {
  check,
  date,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { HABIT_COLORS, HABIT_NAME_MAX_LENGTH } from '../domain/habit.js';

export const habitColor = pgEnum('habit_color', HABIT_COLORS);

export const habits = pgTable(
  'habits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: HABIT_NAME_MAX_LENGTH }).notNull(),
    color: habitColor('color').notNull(),
    weekdays: smallint('weekdays').array().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('habits_active_name_key')
      .on(sql`lower(${table.name})`)
      .where(sql`${table.archivedAt} is null`),
    check(
      'habits_weekdays_check',
      sql`cardinality(${table.weekdays}) between 1 and 7 and ${table.weekdays} <@ '{1,2,3,4,5,6,7}'::smallint[]`,
    ),
  ],
);

export const checkins = pgTable(
  'checkins',
  {
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.habitId, table.date] })],
);

export type HabitRow = typeof habits.$inferSelect;
export type NewHabitRow = typeof habits.$inferInsert;
export type CheckinRow = typeof checkins.$inferSelect;
