import { type Logger, pino } from 'pino';
import type { Config } from '../config.js';

export function createLogger(config: Pick<Config, 'LOG_LEVEL' | 'NODE_ENV'>, name: string): Logger {
  return pino({
    name,
    level: config.LOG_LEVEL,
    ...(config.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss.l' } } }
      : {}),
  });
}
