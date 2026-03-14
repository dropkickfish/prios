import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { db, schema } from '../db.js'
import { eq, and, gt } from 'drizzle-orm'

const SESSION_TTL = Number(process.env.SESSION_TTL ?? 2592000) * 1000 // ms

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function verifyTokenHash(token: string, hash: string): boolean {
  const incoming = hashToken(token)
  try {
    return timingSafeEqual(Buffer.from(incoming, 'hex'), Buffer.from(hash, 'hex'))
  } catch {
    return false
  }
}

export async function createSession(userId: string, userAgent?: string): Promise<string> {
  const refreshToken = generateRefreshToken()
  const refreshTokenHash = hashToken(refreshToken)
  const now = Date.now()

  await db.insert(schema.sessions).values({
    userId,
    refreshTokenHash,
    userAgent: userAgent ?? null,
    createdAt: now,
    lastUsedAt: now,
    expiresAt: now + SESSION_TTL,
  })

  return refreshToken
}

/** Rotate a refresh token — deletes old session, creates new one. Returns new refresh token or null if invalid/expired. */
export async function rotateRefreshToken(oldTokenHash: string, userId: string, userAgent?: string): Promise<string | null> {
  const now = Date.now()
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.refreshTokenHash, oldTokenHash),
        eq(schema.sessions.userId, userId),
        gt(schema.sessions.expiresAt, now),
      )
    )

  if (!session) return null

  await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id))

  const newToken = generateRefreshToken()
  await db.insert(schema.sessions).values({
    userId,
    refreshTokenHash: hashToken(newToken),
    userAgent: userAgent ?? session.userAgent,
    createdAt: session.createdAt,
    lastUsedAt: now,
    expiresAt: session.expiresAt, // preserve original expiry
  })

  return newToken
}

export async function revokeSession(refreshTokenHash: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.refreshTokenHash, refreshTokenHash))
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId))
}

/** Returns userId if a valid session exists for this refresh token hash, else null. */
export async function getSessionUser(refreshTokenHash: string): Promise<string | null> {
  const now = Date.now()
  const [session] = await db
    .select({ userId: schema.sessions.userId })
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.refreshTokenHash, refreshTokenHash),
        gt(schema.sessions.expiresAt, now),
      )
    )
  return session?.userId ?? null
}
