// Load .env before any env var is read — must be the first import.
import 'dotenv/config';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import * as sqliteSchema from './schema.js';
import * as pgSchema from './schema.pg.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// DATABASE_URL controls which adapter is used:
//   postgres://... or postgresql://...  → PostgreSQL via node-postgres
//   anything else (or unset)            → SQLite; value treated as file path (default: sqlite.db)
function createDb(): { db: BetterSQLite3Database<typeof sqliteSchema>; schema: typeof sqliteSchema } {
  const url = process.env.DATABASE_URL;

  if (url?.startsWith('postgres')) {
    const pool = new Pool({ connectionString: url });
    const pgDb = drizzlePg(pool, { schema: pgSchema });
    // Both adapters share the same query API surface. We assert the SQLite type so all
    // existing route imports continue to typecheck without modification.
    return {
      db: pgDb as unknown as BetterSQLite3Database<typeof sqliteSchema>,
      schema: pgSchema as unknown as typeof sqliteSchema,
    };
  }

  const sqlite = new Database(url ?? 'sqlite.db');
  return { db: drizzleSqlite(sqlite, { schema: sqliteSchema }), schema: sqliteSchema };
}

export const { db, schema } = createDb();
