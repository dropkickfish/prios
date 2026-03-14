import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;
const isPg = url?.startsWith('postgres');

export default defineConfig(
  isPg
    ? {
        schema: './src/schema.pg.ts',
        out: './drizzle/pg',
        dialect: 'postgresql',
        dbCredentials: { url: url! },
      }
    : {
        schema: './src/schema.ts',
        out: './drizzle/sqlite',
        dialect: 'sqlite',
        dbCredentials: { url: url ?? 'sqlite.db' },
      }
);
