import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { db, schema } from '../db.js'
import { eq } from 'drizzle-orm'
import { hashKey, verifyToken } from '../lib/apiKey.js'

// Pure helper functions — exported for unit testing.

export function isLocalhost(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'
}

/**
 * Resolve the active key hash to compare against.
 * - Env var takes precedence: its hash is computed on every request (plaintext never stored).
 * - Falls back to the DB-stored hash.
 */
export function resolveActiveHash(
  envKey: string | undefined,
  dbHash: string | null | undefined,
): string | null {
  if (envKey) return hashKey(envKey)
  return dbHash ?? null
}

const apiKeyMiddleware: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (isLocalhost(request.ip)) return

    // Resolve the active hash (env var or DB)
    let activeHash: string | null = resolveActiveHash(process.env.API_KEY, null)

    if (!activeHash) {
      const [settings] = await db
        .select({ apiKeyHash: schema.appSettings.apiKeyHash })
        .from(schema.appSettings)
        .where(eq(schema.appSettings.id, 'singleton'))
      activeHash = resolveActiveHash(undefined, settings?.apiKeyHash)
    }

    if (!activeHash) return // No key configured — pass through

    const authHeader = request.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!verifyToken(token, activeHash)) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })
}

export default fp(apiKeyMiddleware)
