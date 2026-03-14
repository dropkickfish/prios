import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { db, schema } from '../db.js'
import { eq, and, gt } from 'drizzle-orm'
import { hashToken, verifyTokenHash } from '../lib/session.js'

// Public routes that never require auth
const PUBLIC_PATHS = new Set([
  '/health',
  '/api/auth/providers',
])

function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true
  // OAuth start/callback routes are always public
  if (path.startsWith('/api/auth/') && (path.endsWith('/start') || path.endsWith('/callback'))) return true
  // Token refresh and logout need special handling (cookie-based, no Bearer)
  if (path === '/api/auth/refresh' || path === '/api/auth/logout') return true
  return false
}

export function isLocalhost(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'
}

function isTrustedProxy(ip: string): boolean {
  const trusted = process.env.TRUSTED_PROXIES
  if (!trusted) return false
  return trusted.split(',').map(s => s.trim()).some(cidrOrIp => {
    if (!cidrOrIp.includes('/')) return ip === cidrOrIp
    // Basic CIDR check for /prefix notation
    const [base, bits] = cidrOrIp.split('/')
    const mask = ~(0xffffffff >>> Number(bits))
    const toInt = (a: string) => a.split('.').reduce((acc, o) => (acc << 8) | Number(o), 0)
    return (toInt(ip) & mask) === (toInt(base) & mask)
  })
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string | null
  }
}

const authMiddleware: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('userId', null)

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (isPublicPath(request.url.split('?')[0])) return

    // Localhost — trust without auth
    if (isLocalhost(request.ip)) return

    const authEnabled = process.env.AUTH_ENABLED === 'true'

    // Trusted proxy forwarded identity
    if (isTrustedProxy(request.ip)) {
      const forwardedEmail = request.headers['x-auth-request-user'] as string | undefined
      if (forwardedEmail) {
        const [user] = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.email, forwardedEmail))
        if (user) {
          request.userId = user.id
          return
        }
      }
    }

    // Bearer token (PAT)
    const authHeader = request.headers.authorization
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (bearerToken) {
      // Check PATs in DB
      const tokenHash = hashToken(bearerToken)
      const now = Date.now()
      const [key] = await db
        .select({ id: schema.apiKeys.id, userId: schema.apiKeys.userId, expiresAt: schema.apiKeys.expiresAt })
        .from(schema.apiKeys)
        .where(eq(schema.apiKeys.hash, tokenHash))

      if (key && (key.expiresAt === null || key.expiresAt > now)) {
        request.userId = key.userId
        // Update lastUsedAt — fire-and-forget
        db.update(schema.apiKeys).set({ lastUsedAt: now }).where(eq(schema.apiKeys.id, key.id)).catch(() => {})
        return
      }

      // Legacy: API_KEY env var (global key, no userId)
      if (process.env.API_KEY) {
        const legacyHash = hashToken(process.env.API_KEY)
        if (verifyTokenHash(bearerToken, legacyHash)) {
          // For legacy key, try to find the first user
          const [firstUser] = await db.select({ id: schema.users.id }).from(schema.users)
          request.userId = firstUser?.id ?? null
          return
        }
      }
    }

    // Session cookie — access token (JWT)
    const sessionCookie = request.cookies?.prios_session
    if (sessionCookie) {
      try {
        const payload = fastify.jwt.verify<{ sub: string }>(sessionCookie)
        request.userId = payload.sub
        return
      } catch {
        // Access token expired — client should call /api/auth/refresh
      }
    }

    if (authEnabled) {
      return reply.status(401).send({ error: 'Unauthorised' })
    }

    // AUTH_ENABLED not set — open mode, pass through (local dev / no-config deployment)
  })
}

export default fp(authMiddleware)
