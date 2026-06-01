/**
 * Audit logging middleware — records all security-sensitive auth events.
 *
 * Writes to the auditLogs table asynchronously (non-blocking).
 * Should be used as a post-action hook, not as a blocking middleware.
 *
 * Usage (service layer):
 *   await writeAuditLog('user.login', { userId: user.id, ipAddress: req.ip })
 */

import { db, auditLogs } from '@complete-auth/db';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger.js';

/**
 * Write a single audit log entry.
 *
 * @param {string} action - e.g., 'user.login', 'user.2fa_enabled'
 * @param {object} opts
 * @param {string} [opts.userId]
 * @param {Record<string, any>} [opts.metadata]
 * @param {string} [opts.ipAddress]
 * @param {string} [opts.userAgent]
 */
export async function writeAuditLog(action, opts = {}) {
  try {
    await db.insert(auditLogs).values({
      id: uuidv4(),
      action,
      userId: opts.userId ?? null,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent ?? null,
      createdAt: new Date(),
    });
  } catch (err) {
    // Audit log failures must never block the main request flow
    logger.error({ err, action }, 'Failed to write audit log');
  }
}

/**
 * Extract client IP from Express request, handling proxies.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}
