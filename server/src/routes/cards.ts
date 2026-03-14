import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db.js';
import { eq, and, or } from 'drizzle-orm';
import type { StoragePort } from '../storage/port.js';
import { isTimeAllowed } from '../lib/scheduling.js';
import { getCalendarEvents, createCalendarEvent, deleteCalendarEvent } from '../lib/google.js';
import { getOrCreateTodayStats } from '../lib/stats.js';
import { idParam, boardIdParam, successResponse, errorResponse } from '../schemas/common.js';
import { cardResponse, cardBody, cardPatch } from '../schemas/cards.js';

interface CardsRouteOptions {
  storage: StoragePort
}

const cardsRoutes: FastifyPluginAsync<CardsRouteOptions> = async (fastify, opts) => {
  const { storage } = opts

  fastify.delete('/cards/:id', {
    schema: {
      tags: ['cards'],
      summary: 'Delete a card',
      params: idParam,
      response: {
        200: successResponse,
        404: errorResponse,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as any;
    const cardRows = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
    if (cardRows.length === 0) return reply.status(404).send({ error: 'Card not found' });
    const card = cardRows[0];
    const statusRow = await db.select().from(schema.statuses).where(eq(schema.statuses.id, card.statusId));
    const wasDoing = statusRow[0]?.category === 'doing';

    if (wasDoing) {
      try {
        const stats = await getOrCreateTodayStats();
        await db.update(schema.userStats)
          .set({ abandonedCount: (stats.abandonedCount || 0) + 1 })
          .where(eq(schema.userStats.date, stats.date));
      } catch (err) {
        request.log.error(err, 'Failed to update abandoned stats');
      }
    }

    // Fetch attachment keys before CASCADE removes them
    const cardAttachments = await db
      .select({ key: schema.attachments.storageKey })
      .from(schema.attachments)
      .where(eq(schema.attachments.cardId, id))

    await db.delete(schema.cards).where(eq(schema.cards.id, id));
    await db.delete(schema.cardTags).where(eq(schema.cardTags.cardId, id));

    // Best-effort file cleanup; orphan sweep catches any failures
    if (cardAttachments.length) {
      storage.deleteMany(cardAttachments.map(a => a.key)).catch(err =>
        request.log.error({ err }, '[cleanup] File delete failed, orphan sweep will catch it')
      )
    }

    return { success: true };
  });

  fastify.get('/boards/:boardId/cards', {
    schema: {
      tags: ['cards'],
      summary: 'List cards for a board',
      params: boardIdParam,
      response: {
        200: { type: 'array', items: cardResponse },
      },
    },
  }, async (request) => {
    const { boardId } = request.params as any;
    const boardStatuses = await db.select().from(schema.statuses).where(eq(schema.statuses.boardId, boardId));
    const statusById = new Map(boardStatuses.map(s => [s.id, s]));
    const cards = await db.select().from(schema.cards).where(eq(schema.cards.boardId, boardId));

    // Fetch tags for these cards
    const allCardIds = cards.map(c => c.id);
    let tagsMap = new Map();
    if (allCardIds.length > 0) {
      const cardTagsJoined = await db.select({
        cardId: schema.cardTags.cardId,
        tag: schema.tags
      })
      .from(schema.cardTags)
      .innerJoin(schema.tags, eq(schema.cardTags.tagId, schema.tags.id))
      .where(or(...allCardIds.map(id => eq(schema.cardTags.cardId, id))));
      cardTagsJoined.forEach(ct => {
        if (!tagsMap.has(ct.cardId)) tagsMap.set(ct.cardId, []);
        tagsMap.get(ct.cardId).push(ct.tag);
      });
    }

    return cards.map(c => {
      const status = statusById.get(c.statusId);
      return {
        ...c,
        statusCategory: status?.category ?? null,
        smartScore: parseFloat(((c.priority / c.difficulty) - (0.5 * (c.deferredCount || 0))).toFixed(2)),
        tags: tagsMap.get(c.id) || []
      };
    });
  });

  fastify.post('/boards/:boardId/cards', {
    schema: {
      tags: ['cards'],
      summary: 'Create a card on a board',
      params: boardIdParam,
      body: cardBody,
      response: {
        200: cardResponse,
      },
    },
  }, async (request) => {
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

  fastify.post('/cards', {
    schema: {
      tags: ['cards'],
      summary: 'Get a card by ID (legacy endpoint)',
      hide: true,
    },
  }, async (request, reply) => {
    const { id } = request.params as any;
    const card = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
    if (!card[0]) return reply.status(404).send({ error: 'Card not found' });
    return card[0];
  });

  fastify.get('/cards/:id', {
    schema: {
      tags: ['cards'],
      summary: 'Get a card by ID',
      params: idParam,
      response: {
        200: cardResponse,
        404: errorResponse,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as any;
    const card = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
    if (!card[0]) return reply.status(404).send({ error: 'Card not found' });
    return card[0];
  });

  fastify.patch('/cards/:id', {
    schema: {
      tags: ['cards'],
      summary: 'Update a card',
      params: idParam,
      body: cardPatch,
      response: {
        200: cardResponse,
        400: errorResponse,
        404: errorResponse,
      },
    },
  }, async (request, reply) => {
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

    // Logic for Skips (deferredCount increase)
    if (updates.deferredCount) {
       const card = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
       if (card[0] && updates.deferredCount > card[0].deferredCount) {
          // This is a skip
          const stats = await getOrCreateTodayStats();
          await db.update(schema.userStats)
            .set({ skippedCount: (stats.skippedCount || 0) + 1 })
            .where(eq(schema.userStats.date, stats.date));
       }
    }

    if (updates.statusId) {
      updates.statusChangedAt = new Date();
    }

    const result = await db.update(schema.cards).set(updates).where(eq(schema.cards.id, id)).returning();
    return result[0];
  });

  fastify.get('/cards/:id/schedule-suggestions', {
    schema: {
      tags: ['cards'],
      summary: 'Get scheduling suggestions for a card',
      params: idParam,
      querystring: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD — defaults to today' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  startTime: { type: 'string', format: 'date-time' },
                  endTime: { type: 'string', format: 'date-time' },
                  label: { type: 'string' },
                },
              },
            },
            currentDifficulty: { type: 'integer' },
          },
        },
        404: errorResponse,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as any;
    const { date } = request.query as any; // YYYY-MM-DD

    const cardResult = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
    if (!cardResult[0]) return reply.status(404).send({ error: 'Card not found' });
    const card = cardResult[0];

    let targetDate = new Date();
    if (date) {
      targetDate = new Date(date);
    }

    // Set range for the requested day
    const rangeStart = new Date(targetDate);
    rangeStart.setHours(0,0,0,0);

    const rangeEnd = new Date(targetDate);
    rangeEnd.setHours(23,59,59,999);

    // If today, don't show past slots
    let currentTime = rangeStart.getTime();
    if (rangeStart.toDateString() === new Date().toDateString()) {
      currentTime = Math.max(Date.now(), currentTime);
    }

    const events = await getCalendarEvents(rangeStart, rangeEnd);
    const busySlots = events.map((event: any) => ({
      start: new Date(event.start.dateTime || event.start.date).getTime(),
      end: new Date(event.end.dateTime || event.end.date).getTime(),
    }));

    const suggestions = [];

    // Round to next 15 mins
    currentTime = Math.ceil(currentTime / (15 * 60 * 1000)) * (15 * 60 * 1000);

    const durationMs = card.difficulty * 30 * 60 * 1000;



    while (suggestions.length < 5 && currentTime < rangeEnd.getTime()) {
      const slotEnd = currentTime + durationMs;

      // Check board schedule
      const constraint = isTimeAllowed(currentTime, slotEnd, card.boardId ? (await db.select().from(schema.boards).where(eq(schema.boards.id, card.boardId))).map(b => b.availabilitySchedule)[0] : null);
      if (!constraint.allowed) {
        currentTime = constraint.nextStart || (currentTime + 15 * 60 * 1000);
        // Re-align to 15 mins if needed, though nextStart should be aligned usually
        continue;
      }

      const conflict = busySlots.find(s => (currentTime < s.end && slotEnd > s.start));

      if (conflict) {
        currentTime = conflict.end + (5 * 60 * 1000);
        currentTime = Math.ceil(currentTime / (15 * 60 * 1000)) * (15 * 60 * 1000);
      } else {
        suggestions.push({
          startTime: new Date(currentTime).toISOString(),
          endTime: new Date(slotEnd).toISOString(),
          label: (() => {
            const slotDate = new Date(currentTime);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            const timeStr = slotDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

            // Check if same day
            if (slotDate.toDateString() === today.toDateString()) {
              return timeStr;
            }
            // Check if tomorrow
            if (slotDate.toDateString() === tomorrow.toDateString()) {
              return `${timeStr} (Tomorrow)`;
            }
            // Otherwise show day name
            const dayName = slotDate.toLocaleDateString('en-GB', { weekday: 'short' });
            return `${timeStr} (${dayName})`;
          })()
        });
        currentTime += durationMs + (60 * 60 * 1000); // 1 hour gap between suggestions
        currentTime = Math.ceil(currentTime / (15 * 60 * 1000)) * (15 * 60 * 1000);
      }
    }

    return { suggestions, currentDifficulty: card.difficulty };
  });

  fastify.post('/cards/:id/schedule', {
    schema: {
      tags: ['cards'],
      summary: 'Schedule a card (auto-find slot or use provided time)',
      params: idParam,
      body: {
        type: 'object',
        properties: {
          scheduledAt: { type: 'string', format: 'date-time', description: 'ISO 8601 datetime — omit for auto-scheduling' },
          durationMinutes: { type: 'integer' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            scheduledAt: { type: 'string', format: 'date-time' },
          },
        },
        404: errorResponse,
        409: errorResponse,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as any;
    const { scheduledAt, durationMinutes } = request.body as any;

    const cardResult = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
    if (!cardResult[0]) return reply.status(404).send({ error: 'Card not found' });
    const card = cardResult[0];

    let finalScheduledAt: Date;
    let finalDuration: number;

    if (scheduledAt) {
      finalScheduledAt = new Date(scheduledAt);
      finalDuration = durationMinutes || (card.difficulty * 30);
    } else {
      // 1. Get busy slots
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      const events = await getCalendarEvents(todayStart, todayEnd);
      const busySlots = events.map((event: any) => ({
        start: new Date(event.start.dateTime || event.start.date).getTime(),
        end: new Date(event.end.dateTime || event.end.date).getTime(),
      }));

      // 2. Find first free slot
      let currentTime = Date.now();
      const durationMs = card.difficulty * 30 * 60 * 1000;
      let foundSlot = false;
      while (!foundSlot) {
        const slotEnd = currentTime + durationMs;
        const conflict = busySlots.find(s => (currentTime < s.end && slotEnd > s.start));
        if (conflict) {
          currentTime = conflict.end + (5 * 60 * 1000);
        } else {
          foundSlot = true;
        }
      }
      finalScheduledAt = new Date(currentTime);
      finalDuration = card.difficulty * 30;
    }

    // 3. Find/Create 'scheduled' status for this board
    let scheduledStatus = (await db.select()
      .from(schema.statuses)
      .where(and(eq(schema.statuses.boardId, card.boardId), eq(schema.statuses.category, 'scheduled'))))[0];

    if (!scheduledStatus) {
      // Auto-create lane if missing
      const results = await db.insert(schema.statuses).values({
        boardId: card.boardId,
        name: 'Scheduled',
        order: 2, // Approximate
        category: 'scheduled'
      }).returning();
      scheduledStatus = results[0];
      fastify.log.info({ boardId: card.boardId }, 'Auto-created missing Scheduled status lane');
    }

      // 4. Update card
      // Check constraints before final update
      // Check overlap with existing events if scheduled manually
      if (scheduledAt) {
         const checkStart = finalScheduledAt;
         const checkEnd = new Date(finalScheduledAt.getTime() + finalDuration * 60000);

         // Re-fetch busy slots just to be safe or reuse
         const busyStartCheck = new Date(checkStart.getTime());
         const busyEndCheck = new Date(checkEnd.getTime());
         busyStartCheck.setHours(0,0,0,0);
         busyEndCheck.setHours(23,59,59,999);

         const checkEvents = await getCalendarEvents(busyStartCheck, busyEndCheck);
         const conflict = checkEvents.find((e: any) => {
            const eStart = new Date(e.start.dateTime || e.start.date).getTime();
            const eEnd = new Date(e.end.dateTime || e.end.date).getTime();
            return (checkStart.getTime() < eEnd && checkEnd.getTime() > eStart);
         });

         if (conflict) {
            return reply.status(409).send({ error: 'Selected time overlaps with an existing calendar event.' });
         }
      }

      // Delete old event if exists
      if (card.externalEventId) {
          await deleteCalendarEvent(card.externalEventId);
      }

      const eventId = await createCalendarEvent(`[Prios] ${card.title}`, finalScheduledAt, finalDuration);

      await db.update(schema.cards).set({
        scheduledAt: finalScheduledAt,
        statusId: scheduledStatus.id,
        externalEventId: eventId,
      }).where(eq(schema.cards.id, id));

    return { success: true, scheduledAt: finalScheduledAt };
  });
};

export default cardsRoutes;
