/**
 * Health check router.
 *
 * GET /health     — liveness probe (always 200 if process is alive)
 * GET /health/db  — readiness probe (checks DB connectivity)
 * GET /health/redis — readiness probe (checks Redis connectivity)
 *
 * Used by Docker Compose healthcheck, load balancers, and k8s probes.
 */

import { Router } from 'express';
import { db } from '@complete-auth/db';
import { sql } from 'drizzle-orm';
import { getRedisClient } from '../redis.js';

const router = Router();

// ── Liveness ──────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  return res.json({
    status: 'ok',
    service: 'complete-auth-server',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// ── Readiness (DB + Redis) ────────────────────────────────────────────────────

router.get('/ready', async (req, res) => {
  const checks = { database: false, redis: false };
  let allHealthy = true;

  try {
    await db.run(sql`SELECT 1`);
    checks.database = true;
  } catch {
    allHealthy = false;
  }

  try {
    const redis = getRedisClient();
    await redis.ping();
    checks.redis = true;
  } catch {
    allHealthy = false;
  }

  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
