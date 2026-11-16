import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, createDbMock, type DbMock, habitRow, pgError } from './helpers.js';

const LIST_URL = '/api/habits?date=2026-11-16';

function expectErrorShape(body: Record<string, unknown>, statusCode: number, path: string) {
  expect(Object.keys(body).sort()).toEqual(['error', 'message', 'path', 'statusCode', 'timestamp']);
  expect(body.statusCode).toBe(statusCode);
  expect(body.path).toBe(path);
  expect(Number.isNaN(Date.parse(String(body.timestamp)))).toBe(false);
}

describe('error handler', () => {
  let mock: DbMock;
  let app: FastifyInstance;

  beforeEach(async () => {
    mock = createDbMock();
    app = await buildTestApp(mock);
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists every validation problem as field: message', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/habits',
      payload: { name: ' ', color: 'black', weekdays: [0, 0], extra: 1 },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expectErrorShape(body, 400, '/api/habits');
    expect(body.error).toBe('Bad Request');
    expect(body.message).toEqual(
      expect.arrayContaining([
        'body.name: Name must not be empty',
        expect.stringMatching(/^body\.color: /),
        expect.stringMatching(/^body\.weekdays\.0: /),
        'body.weekdays: Weekdays must be unique',
        'body: Unrecognized key: "extra"',
      ]),
    );
  });

  it('reports query validation errors with the query prefix', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/habits?date=2026-02-30' });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toEqual(['query.date: Expected a valid calendar date']);
  });

  it('maps a not found application error', async () => {
    mock.queue([]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/habits/00000000-0000-4000-8000-000000000000?date=2026-11-16',
    });

    expect(res.statusCode).toBe(404);
    expectErrorShape(
      res.json(),
      404,
      '/api/habits/00000000-0000-4000-8000-000000000000?date=2026-11-16',
    );
    expect(res.json().message).toBe('Habit not found');
  });

  it.each([
    ['23505', 409, 'Resource already exists'],
    ['22P02', 400, 'Invalid input syntax'],
    ['23503', 400, 'Referenced resource does not exist'],
  ])('maps Postgres error %s wrapped by drizzle to %i', async (code, status, message) => {
    mock.queue(pgError(code));

    const res = await app.inject({ method: 'GET', url: LIST_URL });

    expect(res.statusCode).toBe(status);
    expectErrorShape(res.json(), status, LIST_URL);
    expect(res.json().message).toBe(message);
  });

  it('turns a duplicate name into a readable conflict', async () => {
    mock.queue(pgError('23505'));

    const res = await app.inject({
      method: 'POST',
      url: '/api/habits',
      payload: { name: '  Meditate ', color: 'teal', weekdays: [1] },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().message).toBe('An active habit named "Meditate" already exists');
  });

  it('hides details of unexpected errors', async () => {
    mock.queue(new Error('connection string postgres://secret@db leaked'));

    const res = await app.inject({ method: 'GET', url: LIST_URL });

    expect(res.statusCode).toBe(500);
    expectErrorShape(res.json(), 500, LIST_URL);
    expect(res.json().message).toBe('Internal Server Error');
    expect(res.body).not.toContain('secret');
  });

  it('hides response serialization errors', async () => {
    mock.queue([{ ...habitRow(), color: 'black' }], []);

    const res = await app.inject({ method: 'GET', url: LIST_URL });

    expect(res.statusCode).toBe(500);
    expect(res.json().message).toBe('Internal Server Error');
  });

  it('answers unknown routes in the same format', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope?x=1' });

    expect(res.statusCode).toBe(404);
    expectErrorShape(res.json(), 404, '/api/nope?x=1');
    expect(res.json().message).toBe('Route GET /api/nope not found');
  });

  it('rejects malformed JSON', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/habits',
      headers: { 'content-type': 'application/json' },
      payload: '{"name":',
    });

    expect(res.statusCode).toBe(400);
    expectErrorShape(res.json(), 400, '/api/habits');
  });

  it('rejects unsupported content types', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/habits',
      headers: { 'content-type': 'text/plain' },
      payload: 'Meditate',
    });

    expect(res.statusCode).toBe(415);
    expectErrorShape(res.json(), 415, '/api/habits');
  });

  it('rejects oversized bodies', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/habits',
      payload: { name: 'x'.repeat(100_000), color: 'red', weekdays: [1] },
    });

    expect(res.statusCode).toBe(413);
    expectErrorShape(res.json(), 413, '/api/habits');
  });

  it('rejects a null body', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/habits/6f1c2a40-0d4e-4b8a-9a51-1c0f3e7a2b01',
      headers: { 'content-type': 'application/json' },
      payload: 'null',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toEqual(['body: Invalid input: expected object, received null']);
  });
});
