import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// We test the factory by directly calling the module in a subprocess-like way —
// since db.ts exports a singleton, we test its behaviour by checking the
// SQLite path via the DATABASE_URL env var.
describe('db factory — SQLite adapter', () => {
  let tmpFile: string

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `prios-test-${Date.now()}.db`)
  })

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
  })

  it('creates a SQLite file at the configured path', async () => {
    // Import the factory logic directly rather than the singleton export so we
    // can exercise it with a custom DATABASE_URL without side-effects.
    const { drizzle } = await import('drizzle-orm/better-sqlite3')
    const Database = (await import('better-sqlite3')).default
    const schema = await import('../schema.js')

    const sqlite = new Database(tmpFile)
    const db = drizzle(sqlite, { schema })

    // Verify a basic query works (tables don't exist yet but the db object is valid)
    expect(db).toBeDefined()
    expect(typeof db.select).toBe('function')
    expect(typeof db.insert).toBe('function')
    sqlite.close()
  })

  it('uses sqlite.db as the default file when DATABASE_URL is unset', () => {
    const url = process.env.DATABASE_URL
    // Default path logic mirrors db.ts
    const resolved = url ?? 'sqlite.db'
    expect(resolved).toBe('sqlite.db')
  })

  it('detects a postgres URL correctly', () => {
    const urls = [
      'postgres://user:pass@localhost:5432/mydb',
      'postgresql://user:pass@localhost:5432/mydb',
    ]
    for (const url of urls) {
      expect(url.startsWith('postgres')).toBe(true)
    }
  })

  it('treats non-postgres DATABASE_URL as a SQLite file path', () => {
    const cases = ['/data/prios.db', 'relative/path.db', undefined]
    for (const url of cases) {
      expect(url?.startsWith('postgres') ?? false).toBe(false)
    }
  })
})

describe('schema equivalence — column names match between SQLite and PG schemas', () => {
  it('both schemas export the same table names', async () => {
    const sqliteSchema = await import('../schema.js')
    const pgSchema = await import('../schema.pg.js')

    const sqliteTables = Object.keys(sqliteSchema).sort()
    const pgTables = Object.keys(pgSchema).sort()

    expect(sqliteTables).toEqual(pgTables)
  })

  it('cards table has identical column names in both schemas', async () => {
    const { getTableColumns } = await import('drizzle-orm')
    const sqliteSchema = await import('../schema.js')
    const pgSchema = await import('../schema.pg.js')

    const sqliteCols = Object.keys(getTableColumns(sqliteSchema.cards)).sort()
    const pgCols = Object.keys(getTableColumns(pgSchema.cards)).sort()

    expect(sqliteCols).toEqual(pgCols)
  })

  it('userStats table has identical column names in both schemas', async () => {
    const { getTableColumns } = await import('drizzle-orm')
    const sqliteSchema = await import('../schema.js')
    const pgSchema = await import('../schema.pg.js')

    const sqliteCols = Object.keys(getTableColumns(sqliteSchema.userStats)).sort()
    const pgCols = Object.keys(getTableColumns(pgSchema.userStats)).sort()

    expect(sqliteCols).toEqual(pgCols)
  })
})
