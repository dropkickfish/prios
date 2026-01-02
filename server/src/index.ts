import Fastify from 'fastify';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { eq, and, or, desc } from 'drizzle-orm';
import dotenv from 'dotenv';
import cors from '@fastify/cors';

dotenv.config();

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite, { schema });

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: true, // For development, allow all origins
});

fastify.get('/health', async () => {
  return { status: 'ok' };
});

// Helper for stats
async function getOrCreateTodayStats() {
  const today = new Date().toISOString().split('T')[0];
  const existing = await db.select().from(schema.userStats).where(eq(schema.userStats.date, today));
  if (existing[0]) return existing[0];
  
  const result = await db.insert(schema.userStats).values({
    date: today,
    completedCount: 0,
    abandonedCount: 0,
    difficultySum: 0,
    prioritySum: 0,
  }).returning();
  return result[0];
}

// Boards
fastify.get('/api/boards', async () => {
  return await db.select().from(schema.boards);
});

fastify.post('/api/boards', async (request) => {
  const { name, availabilitySchedule } = request.body as any;
  const result = await db.insert(schema.boards).values({
    name,
    availabilitySchedule,
  }).returning();
  return result[0];
});

fastify.delete('/api/boards/:id', async (request) => {
  const { id } = request.params as any;
  // Note: For a production app, we'd handle cascading deletes or prevent deletion if cards exist.
  // For MVP, we'll just delete the board.
  await db.delete(schema.boards).where(eq(schema.boards.id, id));
  return { success: true };
});

// Statuses
fastify.get('/api/boards/:boardId/statuses', async (request) => {
  const { boardId } = request.params as any;
  return await db.select().from(schema.statuses).where(eq(schema.statuses.boardId, boardId)).orderBy(schema.statuses.order);
});

fastify.post('/api/boards/:boardId/statuses', async (request) => {
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

// Cards
fastify.get('/api/boards/:boardId/cards', async (request) => {
  const { boardId } = request.params as any;
  return await db.select().from(schema.cards).where(eq(schema.cards.boardId, boardId));
});

fastify.post('/api/boards/:boardId/cards', async (request) => {
  const { boardId } = request.params as any;
  const { statusId, title, description, difficulty, priority } = request.body as any;
  
  const targetStatus = await db.select().from(schema.statuses).where(eq(schema.statuses.id, statusId));
  if (!targetStatus[0]) throw new Error('Status not found');

  // Logic to enforce max 1 card in 'Doing' status category
  if (targetStatus[0].category === 'doing') {
    const existingDoing = await db.select()
      .from(schema.cards)
      .innerJoin(schema.statuses, eq(schema.cards.statusId, schema.statuses.id))
      .where(and(eq(schema.cards.boardId, boardId), eq(schema.statuses.category, 'doing')));
    
    if (existingDoing.length > 0) {
      throw new Error('Only one card can be in "Doing" at a time.');
    }
  }

  const result = await db.insert(schema.cards).values({
    boardId,
    statusId,
    title,
    description,
    difficulty,
    priority,
  }).returning();
  return result[0];
});

fastify.patch('/api/cards/:id', async (request, reply) => {
  const { id } = request.params as any;
  const updates = request.body as any;

  // If changing status, run constraints
  if (updates.statusId) {
    const card = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
    if (!card[0]) return reply.status(404).send({ error: 'Card not found' });

    const targetStatus = await db.select().from(schema.statuses).where(eq(schema.statuses.id, updates.statusId));
    if (!targetStatus[0]) return reply.status(400).send({ error: 'Target status not found' });

    if (targetStatus[0].category === 'doing') {
      // 1. Max 1 Doing Constraint
      const existingDoing = await db.select()
        .from(schema.cards)
        .innerJoin(schema.statuses, eq(schema.cards.statusId, schema.statuses.id))
        .where(and(
          eq(schema.cards.boardId, card[0].boardId), 
          eq(schema.statuses.category, 'doing'),
        ));
      
      const otherDoing = existingDoing.filter(c => c.cards.id !== id);
      if (otherDoing.length > 0) {
        return reply.status(400).send({ error: 'Only one card can be in "Doing" at a time.' });
      }

      // 2. Dependency Check: Blocking tasks must be 'done' to move into 'doing'
      const blockingTasks = await db.select({
        category: schema.statuses.category
      })
        .from(schema.dependencies)
        .innerJoin(schema.cards, eq(schema.dependencies.blockingCardId, schema.cards.id))
        .innerJoin(schema.statuses, eq(schema.cards.statusId, schema.statuses.id))
        .where(eq(schema.dependencies.blockedCardId, id));

      const unfinished = blockingTasks.filter(t => t.category !== 'done');
      if (unfinished.length > 0) {
        return reply.status(400).send({ error: 'Task is blocked by unfinished dependencies.' });
      }
    }

    // Stats Logic: If moving to DONE, increment count
    if (targetStatus[0].category === 'done') {
      const stats = await getOrCreateTodayStats();
      await db.update(schema.userStats)
        .set({ 
          completedCount: (stats.completedCount || 0) + 1,
          difficultySum: (stats.difficultySum || 0) + card[0].difficulty,
          prioritySum: (stats.prioritySum || 0) + card[0].priority
        })
        .where(eq(schema.userStats.date, stats.date));
    }
  }

  const result = await db.update(schema.cards).set(updates).where(eq(schema.cards.id, id)).returning();
  return result[0];
});

fastify.delete('/api/cards/:id', async (request) => {
  const { id } = request.params as any;
  await db.delete(schema.cards).where(eq(schema.cards.id, id));
  return { success: true };
});

// Card Updates
fastify.get('/api/cards/:cardId/updates', async (request) => {
  const { cardId } = request.params as any;
  return await db.select().from(schema.cardUpdates).where(eq(schema.cardUpdates.cardId, cardId)).orderBy(desc(schema.cardUpdates.createdAt));
});

fastify.post('/api/cards/:cardId/updates', async (request) => {
  const { cardId } = request.params as any;
  const { content } = request.body as any;
  const result = await db.insert(schema.cardUpdates).values({
    cardId,
    content,
  }).returning();
  return result[0];
});

// Dependencies
fastify.get('/api/cards/:cardId/dependencies', async (request) => {
  const { cardId } = request.params as any;
  return await db.select().from(schema.dependencies).where(or(eq(schema.dependencies.blockingCardId, cardId), eq(schema.dependencies.blockedCardId, cardId)));
});

fastify.post('/api/dependencies', async (request) => {
  const { blockingCardId, blockedCardId } = request.body as any;
  const result = await db.insert(schema.dependencies).values({
    blockingCardId,
    blockedCardId,
  }).returning();
  return result[0];
});

fastify.delete('/api/dependencies/:id', async (request) => {
  const { id } = request.params as any;
  await db.delete(schema.dependencies).where(eq(schema.dependencies.id, id));
  return { success: true };
});

// Stats Endpoints
fastify.post('/api/stats/abandon', async () => {
  const stats = await getOrCreateTodayStats();
  await db.update(schema.userStats)
    .set({ abandonedCount: (stats.abandonedCount || 0) + 1 })
    .where(eq(schema.userStats.date, stats.date));
  return { success: true };
});

fastify.get('/api/stats', async () => {
  const allStats = await db.select().from(schema.userStats).orderBy(desc(schema.userStats.date));
  
  // Calculate streak
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  let checkDate = new Date();
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const dayStat = allStats.find(s => s.date === dateStr);
    
    if (dayStat && (dayStat.completedCount || 0) > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If today is 0 completion, streak might still be alive if yesterday was > 0
      if (dateStr === today) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  // Calculate velocity (last 7 days average completions)
  const last7Days = allStats.slice(0, 7);
  const totalCompleted = last7Days.reduce((sum, s) => sum + (s.completedCount || 0), 0);
  const weeklyVelocity = totalCompleted / (last7Days.length || 1);

  // Efficiency
  const totalC = allStats.reduce((sum, s) => sum + (s.completedCount || 0), 0);
  const totalA = allStats.reduce((sum, s) => sum + (s.abandonedCount || 0), 0);
  const efficiency = totalC === 0 ? 0 : (totalC / (totalC + totalA)) * 100;

  return {
    currentStreak,
    weeklyVelocity: parseFloat(weeklyVelocity.toFixed(1)),
    efficiency: Math.round(efficiency),
    history: last7Days,
  };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
