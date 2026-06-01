/**
 * Database connection — auto-selects SQLite (dev) or PostgreSQL (prod)
 * based on DATABASE_URL environment variable.
 *
 * SQLite:    DATABASE_URL=file:./dev.db
 * PostgreSQL: DATABASE_URL=postgresql://user:pass@host:5432/dbname
 */

import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'file:./dev.db';

let db;

if (DATABASE_URL.startsWith('file:') || DATABASE_URL.endsWith('.db')) {
  // ── SQLite (development / testing) ──────────────────────────────────────────
  const filePath = DATABASE_URL.replace('file:', '');
  const sqlite = new Database(filePath);

  // Enable WAL mode for better concurrent read performance
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  db = drizzleSQLite(sqlite, { schema });
} else {
  // ── PostgreSQL (production) ──────────────────────────────────────────────────
  // Dynamic import to avoid loading the pg driver in SQLite environments
  const { drizzle: drizzlePg } = await import('drizzle-orm/postgres-js');
  const postgres = await import('postgres');
  const client = postgres.default(DATABASE_URL, { max: 10 });
  db = drizzlePg(client, { schema });
}

export { db };
export * from './schema.js';
