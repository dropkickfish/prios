import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db.js';
import { eq, or, desc } from 'drizzle-orm';

const dependenciesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/cards/:cardId/updates', async (request) => {
    const { cardId } = request.params as any;
    return await db.select().from(schema.cardUpdates).where(eq(schema.cardUpdates.cardId, cardId)).orderBy(desc(schema.cardUpdates.createdAt));
  });

  fastify.post('/cards/:cardId/updates', async (request) => {
    const { cardId } = request.params as any;
    const { content } = request.body as any;
    const result = await db.insert(schema.cardUpdates).values({
      cardId,
      content,
    }).returning();
    return result[0];
  });

  fastify.get('/cards/:cardId/dependencies', async (request) => {
    const { cardId } = request.params as any;
    return await db.select().from(schema.dependencies).where(or(eq(schema.dependencies.blockingCardId, cardId), eq(schema.dependencies.blockedCardId, cardId)));
  });

  fastify.post('/dependencies', async (request) => {
    const { blockingCardId, blockedCardId } = request.body as any;
    const result = await db.insert(schema.dependencies).values({
      blockingCardId,
      blockedCardId,
    }).returning();
    return result[0];
  });

  fastify.delete('/dependencies/:id', async (request) => {
    const { id } = request.params as any;
    await db.delete(schema.dependencies).where(eq(schema.dependencies.id, id));
    return { success: true };
  });
};

export default dependenciesRoutes;
