import type { FastifyPluginAsync } from 'fastify'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db.js'
import type { StoragePort } from '../storage/port.js'
import { sweepOrphanedFiles } from '../storage/sweep.js'
import { v4 as uuidv4 } from 'uuid'

interface AttachmentsRouteOptions {
  storage: StoragePort
}

const attachmentsRoutes: FastifyPluginAsync<AttachmentsRouteOptions> = async (fastify, opts) => {
  const { storage } = opts

  // POST /api/cards/:cardId/attachments
  fastify.post('/cards/:cardId/attachments', async (request, reply) => {
    const { cardId } = request.params as { cardId: string }

    const cardRows = await db.select().from(schema.cards).where(eq(schema.cards.id, cardId))
    if (!cardRows[0]) return reply.status(404).send({ error: 'Card not found' })

    const data = await (request as any).file()
    if (!data) return reply.status(400).send({ error: 'No file uploaded' })

    const buffer: Buffer = await data.toBuffer()
    const ext = path.extname(data.filename)
    const key = `attachments/${uuidv4()}${ext}`

    await storage.put(key, buffer, data.mimetype)

    const rows = await db.insert(schema.attachments).values({
      cardId,
      storageKey: key,
      filename: data.filename,
      mimeType: data.mimetype,
      size: buffer.byteLength,
    }).returning()

    const attachment = rows[0]
    return reply.status(201).send({ ...attachment, url: storage.getUrl(key) })
  })

  // GET /api/cards/:cardId/attachments
  fastify.get('/cards/:cardId/attachments', async (request, reply) => {
    const { cardId } = request.params as { cardId: string }

    const cardRows = await db.select().from(schema.cards).where(eq(schema.cards.id, cardId))
    if (!cardRows[0]) return reply.status(404).send({ error: 'Card not found' })

    const rows = await db.select().from(schema.attachments).where(eq(schema.attachments.cardId, cardId))
    return rows.map(a => ({ ...a, url: storage.getUrl(a.storageKey) }))
  })

  // DELETE /api/attachments/:id
  fastify.delete('/attachments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const rows = await db.select().from(schema.attachments).where(eq(schema.attachments.id, id))
    if (!rows[0]) return reply.status(404).send({ error: 'Attachment not found' })

    const { storageKey } = rows[0]
    await db.delete(schema.attachments).where(eq(schema.attachments.id, id))

    storage.delete(storageKey).catch(err =>
      fastify.log.error({ err, storageKey }, '[cleanup] File delete failed, orphan sweep will catch it')
    )

    return reply.status(204).send()
  })

  // POST /api/admin/sweep — manual orphan sweep trigger
  fastify.post('/admin/sweep', async () => {
    return sweepOrphanedFiles(storage)
  })
}

export default attachmentsRoutes
