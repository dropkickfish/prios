import Fastify from 'fastify';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { eq, and, or, desc } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite, { schema });

const fastify = Fastify({
  logger: true,
});

fastify.get('/health', async () => {
  return { status: 'ok' };
});

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
  
  // Logic to enforce max 1 card in 'Doing' status category
  const targetStatus = await db.select().from(schema.statuses).where(eq(schema.statuses.id, statusId));
  if (targetStatus[0]?.category === 'doing') {
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

fastify.patch('/api/cards/:id', async (request) => {
  const { id } = request.params as any;
  const updates = request.body as any;
  const result = await db.update(schema.cards).set(updates).where(eq(schema.cards.id, id)).returning();
  return result[0];
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

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
