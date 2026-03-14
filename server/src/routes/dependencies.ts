import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db.js';
import { eq, or, desc } from 'drizzle-orm';
import { idParam, cardIdParam, successResponse } from '../schemas/common.js';

const cardUpdateResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    cardId: { type: 'string' },
    content: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

const dependencyResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    blockingCardId: { type: 'string' },
    blockedCardId: { type: 'string' },
  },
};

const dependenciesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/cards/:cardId/updates', {
    schema: {
      tags: ['dependencies'],
      summary: 'List updates (notes) for a card',
      params: cardIdParam,
      response: {
        200: { type: 'array', items: cardUpdateResponse },
      },
    },
  }, async (request) => {
    const { cardId } = request.params as any;
    return await db.select().from(schema.cardUpdates).where(eq(schema.cardUpdates.cardId, cardId)).orderBy(desc(schema.cardUpdates.createdAt));
  });

  fastify.post('/cards/:cardId/updates', {
    schema: {
      tags: ['dependencies'],
      summary: 'Add a note/update to a card',
      params: cardIdParam,
      body: {
        type: 'object',
        properties: {
          content: { type: 'string' },
        },
        required: ['content'],
      },
      response: {
        200: cardUpdateResponse,
      },
    },
  }, async (request) => {
    const { cardId } = request.params as any;
    const { content } = request.body as any;
    const result = await db.insert(schema.cardUpdates).values({
      cardId,
      content,
    }).returning();
    return result[0];
  });

  fastify.get('/cards/:cardId/dependencies', {
    schema: {
      tags: ['dependencies'],
      summary: 'List dependencies for a card (blocking and blocked)',
      params: cardIdParam,
      response: {
        200: { type: 'array', items: dependencyResponse },
      },
    },
  }, async (request) => {
    const { cardId } = request.params as any;
    return await db.select().from(schema.dependencies).where(or(eq(schema.dependencies.blockingCardId, cardId), eq(schema.dependencies.blockedCardId, cardId)));
  });

  fastify.post('/dependencies', {
    schema: {
      tags: ['dependencies'],
      summary: 'Create a dependency between two cards',
      body: {
        type: 'object',
        properties: {
          blockingCardId: { type: 'string' },
          blockedCardId: { type: 'string' },
        },
        required: ['blockingCardId', 'blockedCardId'],
      },
      response: {
        200: dependencyResponse,
      },
    },
  }, async (request) => {
    const { blockingCardId, blockedCardId } = request.body as any;
    const result = await db.insert(schema.dependencies).values({
      blockingCardId,
      blockedCardId,
    }).returning();
    return result[0];
  });

  fastify.delete('/dependencies/:id', {
    schema: {
      tags: ['dependencies'],
      summary: 'Delete a dependency',
      params: idParam,
      response: {
        200: successResponse,
      },
    },
  }, async (request) => {
    const { id } = request.params as any;
    await db.delete(schema.dependencies).where(eq(schema.dependencies.id, id));
    return { success: true };
  });
};

export default dependenciesRoutes;
