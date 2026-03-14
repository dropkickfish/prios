import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoragePort } from '../storage/port.js'

// Mock the db module before importing sweep
vi.mock('../db.js', () => {
  const mockSelect = vi.fn()
  return {
    db: { select: mockSelect },
    schema: {
      attachments: { storageKey: 'storageKey' },
    },
  }
})

// Import after mock is set up
const { sweepOrphanedFiles } = await import('../storage/sweep.js')
const { db } = await import('../db.js')

function makeStorage(storageKeys: string[]): StoragePort & { deleted: string[] } {
  const deleted: string[] = []
  return {
    deleted,
    async put() { return { key: '', mimeType: '', size: 0 } },
    async delete(key) { deleted.push(key) },
    async deleteMany(keys) { deleted.push(...keys) },
    getUrl(key) { return key },
    async listKeys() { return storageKeys },
  }
}

function mockDbRows(keys: string[]) {
  // Drizzle chains: db.select(…).from(…) → resolves to rows
  const from = vi.fn().mockResolvedValue(keys.map(key => ({ key })))
  ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sweepOrphanedFiles', () => {
  it('deletes files that are in storage but not in the DB', async () => {
    mockDbRows(['attachments/known.png'])
    const storage = makeStorage(['attachments/known.png', 'attachments/orphan.png'])

    const result = await sweepOrphanedFiles(storage)

    expect(result.deleted).toBe(1)
    expect(storage.deleted).toEqual(['attachments/orphan.png'])
  })

  it('returns 0 when all storage files are referenced in the DB', async () => {
    mockDbRows(['attachments/a.png', 'attachments/b.png'])
    const storage = makeStorage(['attachments/a.png', 'attachments/b.png'])

    const result = await sweepOrphanedFiles(storage)

    expect(result.deleted).toBe(0)
    expect(storage.deleted).toHaveLength(0)
  })

  it('returns 0 when storage is empty', async () => {
    mockDbRows([])
    const storage = makeStorage([])

    const result = await sweepOrphanedFiles(storage)

    expect(result.deleted).toBe(0)
  })

  it('deletes all files when DB has no attachments', async () => {
    mockDbRows([])
    const storage = makeStorage(['attachments/a.png', 'attachments/b.png'])

    const result = await sweepOrphanedFiles(storage)

    expect(result.deleted).toBe(2)
    expect(storage.deleted.sort()).toEqual(['attachments/a.png', 'attachments/b.png'])
  })

  it('correctly identifies multiple orphans among known files', async () => {
    mockDbRows(['attachments/keep.png'])
    const storage = makeStorage([
      'attachments/keep.png',
      'attachments/orphan1.png',
      'attachments/orphan2.png',
    ])

    const result = await sweepOrphanedFiles(storage)

    expect(result.deleted).toBe(2)
    expect(storage.deleted.sort()).toEqual(['attachments/orphan1.png', 'attachments/orphan2.png'])
  })
})
