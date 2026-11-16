import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { Database } from '../db/client.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

export interface DbPluginOptions {
  db: Database;
  close?: () => Promise<void>;
}

async function dbPlugin(app: FastifyInstance, { db, close }: DbPluginOptions): Promise<void> {
  app.decorate('db', db);
  if (close) {
    app.addHook('onClose', close);
  }
}

export default fp(dbPlugin, { name: 'db' });
