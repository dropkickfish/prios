import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db.js';
import { eq, and } from 'drizzle-orm';
import { cardIdParam, successResponse } from '../schemas/common.js';

const tagResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    boardId: { type: 'string' },
    name: { type: 'string' },
    colour: { type: 'string', nullable: true },
  },
};

const tagsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/tags', {
    schema: {
      tags: ['tags'],
      summary: 'List tags, optionally filtered by board',
      querystring: {
        type: 'object',
        properties: {
          boardId: { type: 'string' },
        },
      },
      response: {
        200: { type: 'array', items: tagResponse },
      },
    },
  }, async (request) => {
    const { boardId } = request.query as any;
    if (boardId) {
      return await db.select().from(schema.tags).where(eq(schema.tags.boardId, boardId));
    }
    return await db.select().from(schema.tags);
  });

  fastify.post('/tags', {
    schema: {
      tags: ['tags'],
      summary: 'Create or return an existing tag for a board',
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          colour: { type: 'string' },
          boardId: { type: 'string' },
        },
        required: ['name', 'boardId'],
      },
      response: {
        200: tagResponse,
      },
    },
  }, async (request) => {
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

  fastify.get('/cards/:cardId/tags', {
    schema: {
      tags: ['tags'],
      summary: 'List tags on a card',
      params: cardIdParam,
      response: {
        200: { type: 'array', items: { type: 'object', properties: { tag: tagResponse } } },
      },
    },
  }, async (request) => {
    const { cardId } = request.params as any;
    return await db.select({
      tag: schema.tags
    })
    .from(schema.cardTags)
    .innerJoin(schema.tags, eq(schema.cardTags.tagId, schema.tags.id))
    .where(eq(schema.cardTags.cardId, cardId));
  });

  fastify.post('/cards/:cardId/tags', {
    schema: {
      tags: ['tags'],
      summary: 'Add a tag to a card',
      params: cardIdParam,
      body: {
        type: 'object',
        properties: {
          tagId: { type: 'string' },
        },
        required: ['tagId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            cardId: { type: 'string' },
            tagId: { type: 'string' },
          },
        },
      },
    },
  }, async (request) => {
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

  fastify.delete('/cards/:cardId/tags/:tagId', {
    schema: {
      tags: ['tags'],
      summary: 'Remove a tag from a card',
      params: {
        type: 'object',
        properties: {
          cardId: { type: 'string' },
          tagId: { type: 'string' },
        },
        required: ['cardId', 'tagId'],
      },
      response: {
        200: successResponse,
      },
    },
  }, async (request) => {
    const { cardId, tagId } = request.params as any;
    await db.delete(schema.cardTags).where(
      and(eq(schema.cardTags.cardId, cardId), eq(schema.cardTags.tagId, tagId))
    );
    return { success: true };
  });
};

export default tagsRoutes;
