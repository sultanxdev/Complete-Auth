/**
 * Express application — Complete Auth API Server
 *
 * Middleware stack (order matters):
 *   1. Helmet (security headers)
 *   2. CORS (cross-origin — configured for APP_URL)
 *   3. Pino HTTP (request logging with request IDs)
 *   4. Body parsing (JSON)
 *   5. Global rate limiting (express-rate-limit)
 *   6. Better Auth handler (/api/auth/**)
 *   7. Admin routes (/api/admin/**)
 *   8. Health check (/health)
 *   9. 404 handler
 *  10. Global error handler
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { rateLimit } from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';

import { auth } from './auth.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { getEmailQueue } from './queue.js';
import { closeRedis } from './redis.js';
import adminRouter from './routes/admin.js';
import healthRouter from './routes/health.js';

const app = express();

// ── Security Headers (Helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", config.APP_URL],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some OAuth redirects
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [config.APP_URL],
    credentials: true,              // Required for cookie-based sessions
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  })
);

// ── Trust proxy (for accurate IP behind Nginx / load balancer) ────────────────
app.set('trust proxy', 1);

// ── Request Logging (Pino HTTP) ───────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-request-id'] ?? crypto.randomUUID(),
    customLogLevel: (req, res) => {
      if (res.statusCode >= 500) { return 'error'; }
      if (res.statusCode >= 400) { return 'warn'; }
      return 'info';
    },
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        // Intentionally omit body, cookies, and Authorization headers
      }),
    },
  })
);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Global Rate Limiting ──────────────────────────────────────────────────────
// Better Auth has its own per-endpoint rate limits.
// This is a fallback for all other API routes.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many requests.', status: 429 },
  },
  skip: (req) => req.path.startsWith('/health'), // Never rate-limit health checks
});
app.use(globalLimiter);

// ── Bull Board (Queue Monitoring) ─────────────────────────────────────────────
// Admin-only queue monitoring UI at /admin/queues
// Protected by basic auth in production — swap for session-based auth as needed
if (config.NODE_ENV !== 'test') {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(getEmailQueue())],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());
  logger.info('Bull Board mounted at /admin/queues');
}

// ── Better Auth Handler (/api/auth/**) ────────────────────────────────────────
// toNodeHandler converts the Better Auth Web Standard handler to Node.js
// compatible req/res (works with Express, raw http, etc.)
app.all('/api/auth/*', toNodeHandler(auth));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/admin', adminRouter);
app.use('/health', healthRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  return res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found.`, status: 404 },
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled server error');

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: config.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
      status: 500,
    },
  });
});

// ── Server Bootstrap ──────────────────────────────────────────────────────────
const server = app.listen(config.PORT, () => {
  logger.info(
    {
      port: config.PORT,
      env: config.NODE_ENV,
      appUrl: config.APP_URL,
    },
    `🚀 Complete Auth server running on port ${config.PORT}`
  );
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutdown signal received — closing gracefully');

  server.close(async () => {
    await closeRedis();
    logger.info('Server closed');
    process.exit(0);
  });

  // Force kill after 10s if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
