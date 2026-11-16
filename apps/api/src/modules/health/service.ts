import { sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';

export interface HealthReport {
  status: 'ok' | 'error';
  checks: { postgres: 'up' | 'down' };
}

export function createHealthService(db: Database) {
  return {
    async check(): Promise<HealthReport> {
      try {
        await db.execute(sql`select 1`);
        return { status: 'ok', checks: { postgres: 'up' } };
      } catch {
        return { status: 'error', checks: { postgres: 'down' } };
      }
    },
  };
}

export type HealthService = ReturnType<typeof createHealthService>;
