/**
 * Structured logger using Pino.
 *
 * Features:
 * - JSON output in production (machine-readable, ELK/Grafana compatible)
 * - Pretty-printed output in development
 * - Unique request IDs injected via pino-http middleware
 * - Redacts sensitive fields (Authorization headers, passwords, tokens)
 */

import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  // Redact sensitive fields from logs — never log passwords or tokens
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.code',
      '*.password',
      '*.accessToken',
      '*.refreshToken',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  base: {
    env: config.NODE_ENV,
    service: 'complete-auth-server',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
