import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Database } from '../src/db/client.js';
import type { HabitRow } from '../src/db/schema.js';

export interface RecordedCall {
  method: string;
  args: unknown[];
}

export interface DbMock {
  db: Database;
  calls: RecordedCall[];
  queue(...results: unknown[]): void;
  called(method: string): boolean;
}

export function createDbMock(): DbMock {
  const results: unknown[] = [];
  const calls: RecordedCall[] = [];

  const chain = (): unknown =>
    new Proxy(() => undefined, {
      get(_target, prop) {
        if (prop === 'then') {
          const value = results.shift();
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            (value instanceof Error ? Promise.reject(value) : Promise.resolve(value)).then(
              resolve,
              reject,
            );
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          return chain();
        };
      },
    });

  const db = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then' || prop === 'getter' || prop === 'setter') {
          return undefined;
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          return chain();
        };
      },
    },
  );

  return {
    db: db as Database,
    calls,
    queue: (...values) => results.push(...values),
    called: (method) => calls.some((call) => call.method === method),
  };
}

export async function buildTestApp(mock: DbMock): Promise<FastifyInstance> {
  return buildApp({ db: mock.db });
}

export function pgError(code: string): Error {
  const driverError = Object.assign(new Error(`pg error ${code}`), { code });
  return new Error('Failed query', { cause: driverError });
}

export const ids = {
  habit: '6f1c2a40-0d4e-4b8a-9a51-1c0f3e7a2b01',
  missing: '00000000-0000-4000-8000-000000000000',
};

const createdAt = new Date('2026-06-01T08:00:00.000Z');

export function habitRow(overrides: Partial<HabitRow> = {}): HabitRow {
  return {
    id: ids.habit,
    name: 'Read 20 pages',
    color: 'violet',
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}
