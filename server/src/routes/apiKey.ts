import type { FastifyPluginAsync } from 'fastify'
import { db, schema } from '../db.js'
import { eq } from 'drizzle-orm'
import { generateKey, hashKey } from '../lib/apiKey.js'

const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/settings/api-key', {
    schema: {
      tags: ['settings'],
      summary: 'Get API key status',
      response: {
        200: {
          type: 'object',
          properties: {
            configured: { type: 'boolean' },
            preview: { type: 'string', nullable: true },
            source: { type: 'string', enum: ['env', 'db', 'none'] },
          },
        },
      },
    },
  }, async () => {
    if (process.env.API_KEY) {
      const key = process.env.API_KEY
      return {
        configured: true,
        preview: `****${key.slice(-4)}`,
        source: 'env' as const,
      }
    }

    const [settings] = await db
      .select({ apiKeyHint: schema.appSettings.apiKeyHint, apiKeyHash: schema.appSettings.apiKeyHash })
      .from(schema.appSettings)
      .where(eq(schema.appSettings.id, 'singleton'))

    const configured = !!settings?.apiKeyHash

    return {
      configured,
      preview: configured ? `****${settings.apiKeyHint}` : null,
      source: configured ? ('db' as const) : ('none' as const),
    }
  })

  fastify.post('/settings/api-key/rotate', {
    schema: {
      tags: ['settings'],
      summary: 'Generate a new API key — returns the plaintext key once, then discards it',
      response: {
        200: {
          type: 'object',
          properties: {
            key: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    const key = generateKey()
    const hash = hashKey(key)
    const hint = key.slice(-4)

    await db
      .insert(schema.appSettings)
      .values({ id: 'singleton', apiKeyHash: hash, apiKeyHint: hint })
      .onConflictDoUpdate({
        target: schema.appSettings.id,
        set: { apiKeyHash: hash, apiKeyHint: hint },
      })

    // Plaintext key returned once — not stored anywhere on the server
    return { key }
  })

  fastify.delete('/settings/api-key', {
    schema: {
      tags: ['settings'],
      summary: 'Remove the DB-stored API key',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async () => {
    await db
      .update(schema.appSettings)
      .set({ apiKeyHash: null, apiKeyHint: null })
      .where(eq(schema.appSettings.id, 'singleton'))

    return { success: true }
  })
}

export default apiKeyRoutes
