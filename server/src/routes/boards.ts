import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db.js';
import { eq, or, inArray, sql } from 'drizzle-orm';

const boardsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/boards', async () => {
    const boards = await db.select().from(schema.boards).orderBy(schema.boards.order);
    if (boards.length === 0) return boards;

    const countRows = await db
      .select({
        boardId: schema.statuses.boardId,
        category: schema.statuses.category,
        count: sql<number>`count(${schema.cards.id})`.as('count'),
      })
      .from(schema.statuses)
      .leftJoin(schema.cards, eq(schema.cards.statusId, schema.statuses.id))
      .where(inArray(schema.statuses.boardId, boards.map(b => b.id)))
      .groupBy(schema.statuses.boardId, schema.statuses.category);

    return boards.map(board => ({
      ...board,
      cardCounts: Object.fromEntries(
        countRows.filter(r => r.boardId === board.id).map(r => [r.category, Number(r.count)])
      ),
    }));
  });

  fastify.post('/boards', async (request) => {
    const { name, availabilitySchedule, colour } = request.body as any;

    // Get max order
    const existingBoards = await db.select().from(schema.boards);
    const maxOrder = existingBoards.length > 0 ? Math.max(...existingBoards.map(b => b.order)) : 0;

    const validColours = ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'];
    const finalColour = colour || validColours[Math.floor(Math.random() * validColours.length)];

    const result = await db.insert(schema.boards).values({
      name,
      availabilitySchedule,
      colour: finalColour,
      order: maxOrder + 1,
      schedulingWindowDays: (request.body as any).schedulingWindowDays || 3,
    }).returning();

    const board = result[0];

    // Create default statuses
    await db.insert(schema.statuses).values([
      { boardId: board.id, name: 'Maybe', order: 1, category: 'maybe' },
      { boardId: board.id, name: 'Scheduled', order: 2, category: 'scheduled' },
      { boardId: board.id, name: 'Doing', order: 3, category: 'doing' },
      { boardId: board.id, name: 'Done', order: 4, category: 'done' },
      { boardId: board.id, name: "Won't Do", order: 5, category: 'wontdo' },
    ]);

    return board;
  });

  fastify.patch('/boards/:id', async (request, reply) => {
    const { id } = request.params as any;
    const updates = request.body as any;
    const result = await db.update(schema.boards).set(updates).where(eq(schema.boards.id, id)).returning();
    return result[0];
  });

  fastify.put('/boards/reorder', async (request) => {
    const { boards } = request.body as any; // Array of { id, order }

    // Transaction would be better but simple loop works for SQLite
    await db.transaction(async (tx) => {
      for (const board of boards) {
        await tx.update(schema.boards)
          .set({ order: board.order })
          .where(eq(schema.boards.id, board.id));
      }
    });

    return { success: true };
  });

  fastify.delete('/boards/:id', async (request) => {
    const { id } = request.params as any;

    // 1. Get all card IDs for this board to clean up relations
    const boardCards = await db.select().from(schema.cards).where(eq(schema.cards.boardId, id));
    const cardIds = boardCards.map(c => c.id);

    if (cardIds.length > 0) {
      // 2. Delete dependencies (both blocking and blocked)
      await db.delete(schema.dependencies).where(
        or(
          inArray(schema.dependencies.blockingCardId, cardIds),
          inArray(schema.dependencies.blockedCardId, cardIds)
        )
      );

      // 3. Delete cardTags
      await db.delete(schema.cardTags).where(inArray(schema.cardTags.cardId, cardIds));

      // 4. Delete cardUpdates
      await db.delete(schema.cardUpdates).where(inArray(schema.cardUpdates.cardId, cardIds));

      // 5. Delete cardMedia
      await db.delete(schema.cardMedia).where(inArray(schema.cardMedia.cardId, cardIds));

      // 6. Delete cards
      await db.delete(schema.cards).where(eq(schema.cards.boardId, id));
    }

    // 7. Delete statuses
    await db.delete(schema.statuses).where(eq(schema.statuses.boardId, id));

    // 8. Delete tags (board scoped)
    await db.delete(schema.tags).where(eq(schema.tags.boardId, id));

    // 9. Delete board
    await db.delete(schema.boards).where(eq(schema.boards.id, id));

    return { success: true };
  });
};

export default boardsRoutes;
