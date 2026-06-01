/**
 * Drizzle ORM schema for Complete Auth
 *
 * Covers all Better Auth required tables plus custom extensions:
 * - users (+ role, banned, banReason, banExpires)
 * - sessions
 * - accounts (OAuth providers)
 * - verifications (email/magic link tokens)
 * - twoFactors (TOTP secrets + backup codes)
 * - auditLogs (custom — tracks all auth events)
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),

  // RBAC — role hierarchy: guest < user < moderator < admin
  role: text('role', { enum: ['guest', 'user', 'moderator', 'admin'] })
    .notNull()
    .default('user'),

  // Admin controls
  banned: integer('banned', { mode: 'boolean' }).notNull().default(false),
  banReason: text('ban_reason'),
  banExpires: integer('ban_expires', { mode: 'timestamp' }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ─── Accounts (OAuth + Credentials) ──────────────────────────────────────────

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ─── Verifications (email tokens, magic links, password resets) ───────────────

export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ─── Two-Factor Auth ──────────────────────────────────────────────────────────

export const twoFactors = sqliteTable('two_factors', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(), // JSON stringified array
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

/**
 * Captures all security-sensitive auth events.
 *
 * action examples:
 *   user.created, user.login, user.login_failed, user.logout,
 *   user.password_changed, user.password_reset_requested,
 *   user.email_verified, user.email_changed,
 *   user.2fa_enabled, user.2fa_disabled, user.2fa_verified,
 *   user.banned, user.unbanned, user.role_changed,
 *   session.revoked, session.all_revoked,
 *   oauth.linked, oauth.login,
 *   magic_link.requested, magic_link.used,
 *   rate_limit.triggered
 */
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  metadata: text('metadata'), // JSON stringified
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
