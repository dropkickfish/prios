import type { FastifyPluginAsync } from 'fastify'
import { randomBytes } from 'node:crypto'
import { db, schema } from '../db.js'
import { eq, and } from 'drizzle-orm'
import { hashToken } from '../lib/session.js'

function generatePat(): string {
  return `prios_${randomBytes(32).toString('hex')}`
}

const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/settings/api-keys', {
    schema: {
      tags: ['settings'],
      summary: 'List Personal Access Tokens for the current user',
    },
  }, async (request, reply) => {
    const userId = request.userId
    if (!userId) return reply.status(401).send({ error: 'Unauthorised' })

    const keys = await db
      .select({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        hint: schema.apiKeys.hint,
        expiresAt: schema.apiKeys.expiresAt,
        lastUsedAt: schema.apiKeys.lastUsedAt,
        createdAt: schema.apiKeys.createdAt,
      })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.userId, userId))

    return keys
  })

  fastify.post('/settings/api-keys', {
    schema: {
      tags: ['settings'],
      summary: 'Create a Personal Access Token — returns plaintext key once',
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          expiresAt: { type: 'number', nullable: true },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.userId
    if (!userId) return reply.status(401).send({ error: 'Unauthorised' })

    const { name, expiresAt } = request.body as { name: string; expiresAt?: number | null }

    const plaintext = generatePat()
    const hash = hashToken(plaintext)
    const hint = plaintext.slice(-4)

    const [key] = await db
      .insert(schema.apiKeys)
      .values({
        userId,
        name,
        hash,
        hint,
        expiresAt: expiresAt ?? null,
      })
      .returning({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        hint: schema.apiKeys.hint,
        expiresAt: schema.apiKeys.expiresAt,
        createdAt: schema.apiKeys.createdAt,
      })

    // Plaintext returned once — not stored anywhere
    return { ...key, key: plaintext }
  })

  fastify.delete('/settings/api-keys/:id', {
    schema: {
      tags: ['settings'],
      summary: 'Revoke a Personal Access Token',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const userId = request.userId
    if (!userId) return reply.status(401).send({ error: 'Unauthorised' })

    const { id } = request.params as { id: string }

    const result = await db
      .delete(schema.apiKeys)
      .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.userId, userId)))
      .returning({ id: schema.apiKeys.id })

    if (result.length === 0) return reply.status(404).send({ error: 'Key not found' })
    return { success: true }
  })

  // ─── Legacy single-key endpoint — kept for backwards compat ────────────────
  // These delegate to the new PAT system but maintain the old API shape.

  fastify.get('/settings/api-key', {
    schema: {
      tags: ['settings'],
      summary: '(Legacy) Get API key status',
    },
  }, async (request) => {
    // If API_KEY env var is set, report it as before
    if (process.env.API_KEY) {
      const key = process.env.API_KEY
      return { configured: true, preview: `****${key.slice(-4)}`, source: 'env' as const }
    }

    const userId = request.userId
    if (!userId) return { configured: false, preview: null, source: 'none' as const }

    const [latest] = await db
      .select({ hint: schema.apiKeys.hint })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.userId, userId))

    return {
      configured: !!latest,
      preview: latest ? `****${latest.hint}` : null,
      source: latest ? ('db' as const) : ('none' as const),
    }
  })
}

export default apiKeyRoutes
