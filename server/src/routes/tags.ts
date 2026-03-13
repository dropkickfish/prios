import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db.js';
import { eq, and } from 'drizzle-orm';

const tagsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/tags', async (request) => {
    const { boardId } = request.query as any;
    if (boardId) {
      return await db.select().from(schema.tags).where(eq(schema.tags.boardId, boardId));
    }
    return await db.select().from(schema.tags);
  });

  fastify.post('/tags', async (request) => {
    const { name, colour, boardId } = request.body as any;
    if (!boardId) throw new Error('boardId is required');

    const lowerName = name.toLowerCase().trim();

    // Check for existing tag in this board
    const existing = await db.select().from(schema.tags).where(
      and(eq(schema.tags.boardId, boardId), eq(schema.tags.name, lowerName))
    );

    if (existing[0]) return existing[0];

    const result = await db.insert(schema.tags).values({
      boardId,
      name: lowerName,
      colour: colour || 'primary'
    }).returning();
    return result[0];
  });

  fastify.get('/cards/:cardId/tags', async (request) => {
    const { cardId } = request.params as any;
    return await db.select({
      tag: schema.tags
    })
    .from(schema.cardTags)
    .innerJoin(schema.tags, eq(schema.cardTags.tagId, schema.tags.id))
    .where(eq(schema.cardTags.cardId, cardId));
  });

  fastify.post('/cards/:cardId/tags', async (request) => {
    const { cardId } = request.params as any;
    const { tagId } = request.body as any;

    // Check if association already exists
    const existing = await db.select().from(schema.cardTags).where(
      and(eq(schema.cardTags.cardId, cardId), eq(schema.cardTags.tagId, tagId))
    );

    if (existing[0]) return existing[0];

    const result = await db.insert(schema.cardTags).values({ cardId, tagId }).returning();
    return result[0];
  });

  fastify.delete('/cards/:cardId/tags/:tagId', async (request) => {
    const { cardId, tagId } = request.params as any;
    await db.delete(schema.cardTags).where(
      and(eq(schema.cardTags.cardId, cardId), eq(schema.cardTags.tagId, tagId))
    );
    return { success: true };
  });
};

export default tagsRoutes;
