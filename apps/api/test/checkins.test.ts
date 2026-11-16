import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, createDbMock, type DbMock, habitRow, ids, pgError } from './helpers.js';

const TODAY = '2026-11-16';
const url = (date: string, today = TODAY, id = ids.habit) =>
  `/api/habits/${id}/checkins/${date}?today=${today}`;

describe('check-in routes', () => {
  let mock: DbMock;
  let app: FastifyInstance;

  beforeEach(async () => {
    mock = createDbMock();
    app = await buildTestApp(mock);
  });

  afterEach(async () => {
    await app.close();
  });

  it('saves a check-in idempotently', async () => {
    mock.queue([habitRow()], undefined);

    const res = await app.inject({ method: 'PUT', url: url(TODAY) });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    expect(mock.called('insert')).toBe(true);
    expect(mock.called('onConflictDoNothing')).toBe(true);
  });

  it('removes a check-in', async () => {
    mock.queue([habitRow()], undefined);

    const res = await app.inject({ method: 'DELETE', url: url(TODAY) });

    expect(res.statusCode).toBe(204);
    expect(mock.called('delete')).toBe(true);
  });

  it.each([
    ['one day ahead', '2026-11-17', 204],
    ['365 days back', '2025-11-16', 204],
    ['two days ahead', '2026-11-18', 400],
    ['366 days back', '2025-11-15', 400],
  ])('checks the range: %s', async (_label, date, status) => {
    mock.queue([habitRow()], undefined);

    const res = await app.inject({ method: 'PUT', url: url(date) });

    expect(res.statusCode).toBe(status);
    if (status === 400) {
      expect(res.json().message).toBe('Check-in date must be between 2025-11-16 and 2026-11-17');
      expect(mock.calls).toHaveLength(0);
    }
  });

  it.each(['PUT', 'DELETE'] as const)('rejects %s on an archived habit', async (method) => {
    mock.queue([habitRow({ archivedAt: new Date('2026-11-01T10:00:00Z') })]);

    const res = await app.inject({ method, url: url(TODAY) });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      message: 'Archived habits cannot be checked in or out',
    });
    expect(mock.called('insert')).toBe(false);
    expect(mock.called('delete')).toBe(false);
  });

  it('returns 404 for a missing habit', async () => {
    mock.queue([]);

    const res = await app.inject({ method: 'PUT', url: url(TODAY, TODAY, ids.missing) });

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toBe('Habit not found');
  });

  it('returns 404 when the habit disappears before the insert', async () => {
    mock.queue([habitRow()], pgError('23503'));

    const res = await app.inject({ method: 'PUT', url: url(TODAY) });

    expect(res.statusCode).toBe(404);
  });

  it.each([
    ['an impossible date', url('2026-02-30'), 'params.date: Expected a valid calendar date'],
    ['a malformed date', url('2026-1-5'), 'params.date: Expected a date in YYYY-MM-DD format'],
    ['a malformed today', url(TODAY, '16.11.2026'), 'query.today'],
    ['a missing today', `/api/habits/${ids.habit}/checkins/${TODAY}`, 'query.today'],
    ['an invalid id', url(TODAY, TODAY, 'abc'), 'params.id'],
  ])('rejects %s', async (_label, path, message) => {
    const res = await app.inject({ method: 'PUT', url: path });

    expect(res.statusCode).toBe(400);
    expect(res.json().message.join('\n')).toContain(message);
    expect(mock.calls).toHaveLength(0);
  });
});

describe('archive routes', () => {
  let mock: DbMock;
  let app: FastifyInstance;

  beforeEach(async () => {
    mock = createDbMock();
    app = await buildTestApp(mock);
  });

  afterEach(async () => {
    await app.close();
  });

  it('archives a habit', async () => {
    const archivedAt = new Date('2026-11-16T09:00:00.000Z');
    mock.queue([habitRow({ archivedAt })]);

    const res = await app.inject({ method: 'POST', url: `/api/habits/${ids.habit}/archive` });

    expect(res.statusCode).toBe(200);
    expect(res.json().archivedAt).toBe(archivedAt.toISOString());
  });

  it('returns an already archived habit unchanged', async () => {
    const archivedAt = new Date('2026-11-01T09:00:00.000Z');
    mock.queue([], [habitRow({ archivedAt })]);

    const res = await app.inject({ method: 'POST', url: `/api/habits/${ids.habit}/archive` });

    expect(res.statusCode).toBe(200);
    expect(res.json().archivedAt).toBe(archivedAt.toISOString());
  });

  it('refuses to restore a habit whose name is taken', async () => {
    mock.queue(pgError('23505'), [habitRow({ archivedAt: new Date() })]);

    const res = await app.inject({ method: 'POST', url: `/api/habits/${ids.habit}/unarchive` });

    expect(res.statusCode).toBe(409);
    expect(res.json().message).toBe('An active habit named "Read 20 pages" already exists');
  });

  it('returns 404 when archiving a missing habit', async () => {
    mock.queue([], []);

    const res = await app.inject({ method: 'POST', url: `/api/habits/${ids.missing}/archive` });

    expect(res.statusCode).toBe(404);
  });
});
