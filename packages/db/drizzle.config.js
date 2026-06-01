import { defineConfig } from 'drizzle-kit';

const DATABASE_URL = process.env.DATABASE_URL ?? 'file:./dev.db';

const isSQLite = DATABASE_URL.startsWith('file:') || DATABASE_URL.endsWith('.db');

export default defineConfig({
  schema: './src/schema.js',
  out: './drizzle',
  dialect: isSQLite ? 'sqlite' : 'postgresql',
  dbCredentials: isSQLite
    ? { url: DATABASE_URL }
    : { url: DATABASE_URL },
  verbose: true,
  strict: true,
});
