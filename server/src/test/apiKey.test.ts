import { describe, it, expect } from 'vitest'
import { isLocalhost, resolveActiveHash } from '../middleware/apiKey.js'
import { hashKey, verifyToken, generateKey } from '../lib/apiKey.js'

// ── Pure function tests ──────────────────────────────────────────────────────

describe('isLocalhost', () => {
  it('returns true for 127.0.0.1', () => expect(isLocalhost('127.0.0.1')).toBe(true))
  it('returns true for ::1', () => expect(isLocalhost('::1')).toBe(true))
  it('returns true for ::ffff:127.0.0.1', () => expect(isLocalhost('::ffff:127.0.0.1')).toBe(true))
  it('returns false for a public IP', () => expect(isLocalhost('203.0.113.1')).toBe(false))
  it('returns false for empty string', () => expect(isLocalhost('')).toBe(false))
})

describe('hashKey', () => {
  it('returns a 64-char hex string', () => {
    expect(hashKey('secret')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic', () => {
    expect(hashKey('secret')).toBe(hashKey('secret'))
  })

  it('different inputs produce different hashes', () => {
    expect(hashKey('a')).not.toBe(hashKey('b'))
  })
})

describe('generateKey', () => {
  it('returns a 64-char hex string', () => {
    expect(generateKey()).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns unique values each call', () => {
    expect(generateKey()).not.toBe(generateKey())
  })
})

describe('verifyToken', () => {
  const stored = hashKey('correct-token')

  it('returns true for the correct token', () => {
    expect(verifyToken('correct-token', stored)).toBe(true)
  })

  it('returns false for a wrong token', () => {
    expect(verifyToken('wrong-token', stored)).toBe(false)
  })

  it('returns false for null', () => {
    expect(verifyToken(null, stored)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(verifyToken('', stored)).toBe(false)
  })
})

describe('resolveActiveHash', () => {
  it('hashes the env key when provided', () => {
    expect(resolveActiveHash('my-key', null)).toBe(hashKey('my-key'))
  })

  it('env key takes precedence over db hash', () => {
    const dbHash = hashKey('db-key')
    expect(resolveActiveHash('env-key', dbHash)).toBe(hashKey('env-key'))
  })

  it('falls back to db hash when no env key', () => {
    const dbHash = hashKey('db-key')
    expect(resolveActiveHash(undefined, dbHash)).toBe(dbHash)
  })

  it('returns null when neither is set', () => {
    expect(resolveActiveHash(undefined, null)).toBeNull()
  })

  it('returns null when both are absent', () => {
    expect(resolveActiveHash(undefined, undefined)).toBeNull()
  })
})

// ── Fastify integration tests ────────────────────────────────────────────────

import { vi, beforeEach, afterEach } from 'vitest'

vi.mock('../db.js', () => ({
  db: { select: vi.fn() },
  schema: {
    appSettings: { id: 'app_settings_id', apiKeyHash: 'api_key_hash' },
  },
}))

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()
  return { ...actual, eq: vi.fn() }
})

import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'

async function buildApp(dbHash: string | null = null): Promise<FastifyInstance> {
  const { db } = await import('../db.js')
  ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(dbHash !== null ? [{ apiKeyHash: dbHash }] : []),
    }),
  })

  const app = Fastify({ logger: false })
  const { default: apiKeyMiddleware } = await import('../middleware/apiKey.js')
  await app.register(apiKeyMiddleware)
  app.get('/test', async () => ({ ok: true }))
  await app.ready()
  return app
}

describe('middleware — no key configured', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    delete process.env.API_KEY
    app = await buildApp(null)
  })

  afterEach(async () => { await app.close(); vi.resetModules() })

  it('passes through from localhost', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(200)
  })

  it('passes through from a remote IP when no key is set', async () => {
    const res = await app.inject({ method: 'GET', url: '/test', remoteAddress: '203.0.113.1' })
    expect(res.statusCode).toBe(200)
  })
})

describe('middleware — env var key', () => {
  let app: FastifyInstance
  const ENV_KEY = 'test-env-secret'

  beforeEach(async () => {
    process.env.API_KEY = ENV_KEY
    app = await buildApp(null)
  })

  afterEach(async () => { delete process.env.API_KEY; await app.close(); vi.resetModules() })

  it('returns 401 with no token from non-localhost', async () => {
    const res = await app.inject({ method: 'GET', url: '/test', remoteAddress: '203.0.113.1' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 with wrong token', async () => {
    const res = await app.inject({
      method: 'GET', url: '/test', remoteAddress: '203.0.113.1',
      headers: { authorization: 'Bearer wrong-token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('passes with the correct token', async () => {
    const res = await app.inject({
      method: 'GET', url: '/test', remoteAddress: '203.0.113.1',
      headers: { authorization: `Bearer ${ENV_KEY}` },
    })
    expect(res.statusCode).toBe(200)
  })

  it('passes from 127.0.0.1 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/test', remoteAddress: '127.0.0.1' })
    expect(res.statusCode).toBe(200)
  })

  it('passes from ::1 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/test', remoteAddress: '::1' })
    expect(res.statusCode).toBe(200)
  })
})

describe('middleware — DB-stored key', () => {
  let app: FastifyInstance
  const DB_KEY = 'db-stored-secret'
  const DB_HASH = hashKey(DB_KEY)

  beforeEach(async () => {
    delete process.env.API_KEY
    app = await buildApp(DB_HASH)
  })

  afterEach(async () => { await app.close(); vi.resetModules() })

  it('returns 401 with no token from non-localhost', async () => {
    const res = await app.inject({ method: 'GET', url: '/test', remoteAddress: '203.0.113.1' })
    expect(res.statusCode).toBe(401)
  })

  it('passes with the correct token', async () => {
    const res = await app.inject({
      method: 'GET', url: '/test', remoteAddress: '203.0.113.1',
      headers: { authorization: `Bearer ${DB_KEY}` },
    })
    expect(res.statusCode).toBe(200)
  })

  it('returns 401 when token matches the hash string itself (not the preimage)', async () => {
    const res = await app.inject({
      method: 'GET', url: '/test', remoteAddress: '203.0.113.1',
      headers: { authorization: `Bearer ${DB_HASH}` }, // sending the hash, not the key
    })
    expect(res.statusCode).toBe(401)
  })

  it('localhost always passes without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/test', remoteAddress: '127.0.0.1' })
    expect(res.statusCode).toBe(200)
  })
})
