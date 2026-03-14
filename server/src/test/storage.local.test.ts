import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { LocalStorageAdapter } from '../storage/local.js'

let tmpDir: string
let adapter: LocalStorageAdapter

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prios-test-'))
  adapter = new LocalStorageAdapter(tmpDir, 'http://localhost:3000/uploads')
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('LocalStorageAdapter.put', () => {
  it('writes file and returns metadata', async () => {
    const buf = Buffer.from('hello world')
    const result = await adapter.put('attachments/test.txt', buf, 'text/plain')

    expect(result.key).toBe('attachments/test.txt')
    expect(result.mimeType).toBe('text/plain')
    expect(result.size).toBe(11)

    const written = await fs.readFile(path.join(tmpDir, 'attachments/test.txt'))
    expect(written.toString()).toBe('hello world')
  })

  it('creates nested directories as needed', async () => {
    await adapter.put('a/b/c/file.png', Buffer.from('x'), 'image/png')
    const exists = await fs.stat(path.join(tmpDir, 'a/b/c/file.png'))
    expect(exists.isFile()).toBe(true)
  })

  it('overwrites existing file', async () => {
    await adapter.put('attachments/dup.txt', Buffer.from('v1'), 'text/plain')
    await adapter.put('attachments/dup.txt', Buffer.from('v2'), 'text/plain')
    const content = await fs.readFile(path.join(tmpDir, 'attachments/dup.txt'))
    expect(content.toString()).toBe('v2')
  })
})

describe('LocalStorageAdapter.delete', () => {
  it('removes an existing file', async () => {
    await adapter.put('attachments/todelete.txt', Buffer.from('bye'), 'text/plain')
    await adapter.delete('attachments/todelete.txt')
    await expect(fs.stat(path.join(tmpDir, 'attachments/todelete.txt'))).rejects.toThrow()
  })

  it('does not throw when file does not exist', async () => {
    await expect(adapter.delete('attachments/missing.txt')).resolves.toBeUndefined()
  })
})

describe('LocalStorageAdapter.deleteMany', () => {
  it('deletes multiple files', async () => {
    await adapter.put('attachments/a.txt', Buffer.from('a'), 'text/plain')
    await adapter.put('attachments/b.txt', Buffer.from('b'), 'text/plain')
    await adapter.deleteMany(['attachments/a.txt', 'attachments/b.txt'])

    await expect(fs.stat(path.join(tmpDir, 'attachments/a.txt'))).rejects.toThrow()
    await expect(fs.stat(path.join(tmpDir, 'attachments/b.txt'))).rejects.toThrow()
  })

  it('no-ops on empty array', async () => {
    await expect(adapter.deleteMany([])).resolves.toBeUndefined()
  })
})

describe('LocalStorageAdapter.getUrl', () => {
  it('returns full public URL for key', () => {
    expect(adapter.getUrl('attachments/abc123.png')).toBe(
      'http://localhost:3000/uploads/attachments/abc123.png'
    )
  })
})

describe('LocalStorageAdapter.listKeys', () => {
  it('returns empty array when no files exist', async () => {
    const keys = await adapter.listKeys('attachments/')
    expect(keys).toEqual([])
  })

  it('lists all files under a prefix', async () => {
    await adapter.put('attachments/one.png', Buffer.from('1'), 'image/png')
    await adapter.put('attachments/two.png', Buffer.from('2'), 'image/png')
    const keys = await adapter.listKeys('attachments/')
    expect(keys.sort()).toEqual(['attachments/one.png', 'attachments/two.png'])
  })

  it('lists files recursively', async () => {
    await adapter.put('attachments/sub/nested.png', Buffer.from('n'), 'image/png')
    const keys = await adapter.listKeys('attachments/')
    expect(keys).toContain('attachments/sub/nested.png')
  })

  it('does not include files outside the prefix', async () => {
    await adapter.put('attachments/yes.png', Buffer.from('y'), 'image/png')
    await adapter.put('other/no.png', Buffer.from('n'), 'image/png')
    const keys = await adapter.listKeys('attachments/')
    expect(keys.every(k => k.startsWith('attachments/'))).toBe(true)
  })
})
