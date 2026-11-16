import { buildApp } from './app.js';
import { loadConfig, loadEnvFile } from './config.js';
import { createDatabase } from './db/client.js';
import { createLogger } from './lib/logger.js';

loadEnvFile();
const config = loadConfig();
const logger = createLogger(config, 'api');
const { db, pool } = createDatabase(config.DATABASE_URL);

const app = await buildApp({ db, closeDb: () => pool.end(), logger });

let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    app
      .close()
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Shutdown failed');
        process.exit(1);
      });
  });
}

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
}
