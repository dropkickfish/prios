import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db.js';
import { eq } from 'drizzle-orm';

const statusesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/boards/:boardId/statuses', async (request) => {
    const { boardId } = request.params as any;
    let boardStatuses = await db.select().from(schema.statuses).where(eq(schema.statuses.boardId, boardId)).orderBy(schema.statuses.order);

    // Auto-init if missing (for legacy boards or failed creation)
    if (boardStatuses.length === 0) {
      await db.insert(schema.statuses).values([
        { boardId, name: 'Maybe', order: 1, category: 'maybe' },
        { boardId, name: 'Scheduled', order: 2, category: 'scheduled' },
        { boardId, name: 'Doing', order: 3, category: 'doing' },
        { boardId, name: 'Done', order: 4, category: 'done' },
        { boardId, name: "Won't Do", order: 5, category: 'wontdo' },
      ]);
      boardStatuses = await db.select().from(schema.statuses).where(eq(schema.statuses.boardId, boardId)).orderBy(schema.statuses.order);
    }

    return boardStatuses;
  });

  fastify.post('/boards/:boardId/statuses', async (request) => {
    const { boardId } = request.params as any;
    const { name, order, category } = request.body as any;
    const result = await db.insert(schema.statuses).values({
      boardId,
      name,
      order,
      category,
    }).returning();
    return result[0];
  });
};

export default statusesRoutes;
