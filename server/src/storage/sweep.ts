import { db, schema } from '../db.js'
import type { StoragePort } from './port.js'

export async function sweepOrphanedFiles(storage: StoragePort): Promise<{ deleted: number }> {
  const [storageKeys, dbRows] = await Promise.all([
    storage.listKeys('attachments/'),
    db.select({ key: schema.attachments.storageKey }).from(schema.attachments),
  ])

  const dbKeySet = new Set(dbRows.map(r => r.key))
  const orphans = storageKeys.filter(k => !dbKeySet.has(k))

  if (orphans.length) {
    console.log(`[sweep] Deleting ${orphans.length} orphaned file(s)`)
    await storage.deleteMany(orphans)
  }

  return { deleted: orphans.length }
}
