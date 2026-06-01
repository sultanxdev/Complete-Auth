/**
 * Admin router — user management endpoints (requires admin role).
 *
 * All routes require:
 *   1. Active session (requireAuth)
 *   2. Admin role (requireRole('admin'))
 *
 * Endpoints:
 *   GET    /api/admin/users              List users (paginated, filterable)
 *   GET    /api/admin/users/:id          Get user details
 *   PATCH  /api/admin/users/:id/role     Update user role
 *   POST   /api/admin/users/:id/ban      Ban user
 *   POST   /api/admin/users/:id/unban    Unban user
 *   POST   /api/admin/users/:id/force-logout  Revoke all sessions
 *   GET    /api/admin/audit-logs         List audit logs (paginated)
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { requireRole } from '../middleware/require-role.js';
import { auth } from '../auth.js';
import { db, auditLogs, users } from '@complete-auth/db';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import { writeAuditLog, getClientIp } from '../middleware/audit-log.js';
import { logger } from '../logger.js';
import { z } from 'zod';

const router = Router();

// Apply auth guards to all admin routes
router.use(requireAuth, requireRole('admin'));

// ── List Users ───────────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20', 10)));
    const offset = (page - 1) * limit;
    const search = req.query.search ?? '';
    const role = req.query.role;
    const banned = req.query.banned;

    // Build where conditions
    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${users.name} LIKE ${`%${search}%`} OR ${users.email} LIKE ${`%${search}%`})`
      );
    }
    if (role) {
      conditions.push(eq(users.role, role));
    }
    if (banned !== undefined) {
      conditions.push(eq(users.banned, banned === 'true'));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [allUsers, [{ count }]] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          emailVerified: users.emailVerified,
          banned: users.banned,
          banReason: users.banReason,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`count(*)` }).from(users).where(where),
    ]);

    return res.json({
      data: allUsers,
      meta: {
        total: Number(count),
        page,
        limit,
        pages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (err) {
    logger.error({ err }, 'GET /admin/users error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', status: 500 } });
  }
});

// ── Get Single User ───────────────────────────────────────────────────────────

router.get('/users/:id', async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);

    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', status: 404 } });
    }

    return res.json({ data: user });
  } catch (err) {
    logger.error({ err }, 'GET /admin/users/:id error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', status: 500 } });
  }
});

// ── Update Role ───────────────────────────────────────────────────────────────

const updateRoleSchema = z.object({
  role: z.enum(['guest', 'user', 'moderator', 'admin']),
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }

    const { role } = parsed.data;
    const targetId = req.params.id;

    // Prevent admins from downgrading themselves
    if (targetId === req.user.id && role !== 'admin') {
      return res.status(400).json({
        error: { code: 'SELF_ROLE_CHANGE', message: 'Admins cannot change their own role.' },
      });
    }

    await auth.api.setRole({ body: { userId: targetId, role }, headers: req.headers });

    await writeAuditLog('user.role_changed', {
      userId: req.user.id,
      metadata: { targetUserId: targetId, newRole: role },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: { success: true, role } });
  } catch (err) {
    logger.error({ err }, 'PATCH /admin/users/:id/role error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', status: 500 } });
  }
});

// ── Ban User ──────────────────────────────────────────────────────────────────

const banSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});

router.post('/users/:id/ban', async (req, res) => {
  try {
    const parsed = banSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }

    const targetId = req.params.id;

    if (targetId === req.user.id) {
      return res.status(400).json({ error: { code: 'CANNOT_BAN_SELF', message: 'You cannot ban yourself.' } });
    }

    await auth.api.banUser({
      body: {
        userId: targetId,
        banReason: parsed.data.reason,
        banExpiresIn: parsed.data.expiresAt
          ? Math.floor((new Date(parsed.data.expiresAt) - Date.now()) / 1000)
          : undefined,
      },
      headers: req.headers,
    });

    await writeAuditLog('user.banned', {
      userId: req.user.id,
      metadata: { targetUserId: targetId, reason: parsed.data.reason },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: { success: true } });
  } catch (err) {
    logger.error({ err }, 'POST /admin/users/:id/ban error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', status: 500 } });
  }
});

// ── Unban User ────────────────────────────────────────────────────────────────

router.post('/users/:id/unban', async (req, res) => {
  try {
    await auth.api.unbanUser({ body: { userId: req.params.id }, headers: req.headers });

    await writeAuditLog('user.unbanned', {
      userId: req.user.id,
      metadata: { targetUserId: req.params.id },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: { success: true } });
  } catch (err) {
    logger.error({ err }, 'POST /admin/users/:id/unban error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', status: 500 } });
  }
});

// ── Force Logout ──────────────────────────────────────────────────────────────

router.post('/users/:id/force-logout', async (req, res) => {
  try {
    await auth.api.revokeUserSessions({
      body: { userId: req.params.id },
      headers: req.headers,
    });

    await writeAuditLog('session.all_revoked_by_admin', {
      userId: req.user.id,
      metadata: { targetUserId: req.params.id },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: { success: true } });
  } catch (err) {
    logger.error({ err }, 'POST /admin/users/:id/force-logout error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', status: 500 } });
  }
});

// ── Audit Logs ────────────────────────────────────────────────────────────────

router.get('/audit-logs', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
    const offset = (page - 1) * limit;
    const userId = req.query.userId;
    const action = req.query.action;

    const conditions = [];
    if (userId) { conditions.push(eq(auditLogs.userId, userId)); }
    if (action) { conditions.push(like(auditLogs.action, `%${action}%`)); }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [logs, [{ count }]] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`count(*)` }).from(auditLogs).where(where),
    ]);

    return res.json({
      data: logs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      meta: {
        total: Number(count),
        page,
        limit,
        pages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (err) {
    logger.error({ err }, 'GET /admin/audit-logs error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', status: 500 } });
  }
});

export default router;
