import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** SHA-256 hex digest of a key. This is what gets stored in the DB. */
export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/** Generate a cryptographically random 32-byte hex key. */
export function generateKey(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Timing-safe comparison of an incoming plaintext token against a stored SHA-256 hash.
 * Returns false if token is null/empty or lengths don't match (avoids exceptions).
 */
export function verifyToken(token: string | null, storedHash: string): boolean {
  if (!token) return false
  const incomingHash = hashKey(token)
  try {
    return timingSafeEqual(
      Buffer.from(incomingHash, 'hex'),
      Buffer.from(storedHash, 'hex'),
    )
  } catch {
    return false
  }
}
