import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db.js';
import { eq, and, or, isNotNull } from 'drizzle-orm';
import { getCalendarEvents, createCalendarEvent, deleteCalendarEvent } from '../lib/google.js';
import { isTimeAllowed } from '../lib/scheduling.js';

const calendarRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/calendar/availability', async (request) => {
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);

    const events = await getCalendarEvents(todayStart, todayEnd);

    // Basic busy slots extraction
    const busySlots = events.map((event: any) => ({
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      title: event.summary,
    }));

    return { busySlots };
  });

  // Scheduling Engine
  fastify.post('/scheduler/auto', async (request) => {
    const { boardId } = request.body as any;

    // 1. Get cards that need scheduling (e.g., in 'maybe' category)
    const cardsToSchedule = await db.select()
      .from(schema.cards)
      .innerJoin(schema.statuses, eq(schema.cards.statusId, schema.statuses.id))
      .where(and(eq(schema.cards.boardId, boardId), eq(schema.statuses.category, 'maybe')));

    // Get dependencies for these cards
    const allCardIds = cardsToSchedule.map(c => c.cards.id);
    const cardDeps = await db.select().from(schema.dependencies).where(or(
      ...allCardIds.map(id => eq(schema.dependencies.blockedCardId, id))
    ));

    // 2. Get busy slots from Google Calendar
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);
    const events = await getCalendarEvents(todayStart, todayEnd);

    const busySlots = events.map((event: any) => ({
      start: new Date(event.start.dateTime || event.start.date).getTime(),
      end: new Date(event.end.dateTime || event.end.date).getTime(),
    }));

    // Fetch Board Schedule
    const boardRes = await db.select().from(schema.boards).where(eq(schema.boards.id, boardId));
    const boardSchedule = boardRes[0]?.availabilitySchedule;

    // 3. Scheduling Logic: Topological Sort + Priority
    let currentTime = Date.now();
    // Round to next 15 mins
    currentTime = Math.ceil(currentTime / (15 * 60 * 1000)) * (15 * 60 * 1000);
    const results = [];
    const scheduledIds = new Set();

    // Create a dependency map
    const depsMap = new Map();
    cardDeps.forEach(d => {
      if (!depsMap.has(d.blockedCardId)) depsMap.set(d.blockedCardId, []);
      depsMap.get(d.blockedCardId).push(d.blockingCardId);
    });

    // Sort by priority initially
    let remaining = cardsToSchedule.sort((a, b) => b.cards.priority - a.cards.priority);

    while (remaining.length > 0) {
      // Find tasks whose dependencies are already scheduled OR not in this set
      const readyIdx = remaining.findIndex(item => {
        const blockers = depsMap.get(item.cards.id) || [];
        return blockers.every((bid: string) => scheduledIds.has(bid) || !allCardIds.includes(bid));
      });

      if (readyIdx === -1) break; // Circular dependency or stuck

      const item = remaining.splice(readyIdx, 1)[0];
      const card = item.cards;
      const durationMs = card.difficulty * 30 * 60 * 1000;

      let foundSlot = false;
      while (!foundSlot) {
        const slotEnd = currentTime + durationMs;

        // Check board schedule
        const constraint = isTimeAllowed(currentTime, slotEnd, boardSchedule);
        if (!constraint.allowed) {
          currentTime = constraint.nextStart || (currentTime + 5 * 60 * 1000);
          continue;
        }

        const conflict = busySlots.find(s => (currentTime < s.end && slotEnd > s.start));

        if (conflict) {
          currentTime = conflict.end + (5 * 60 * 1000); // 5 min buffer
        } else {
          foundSlot = true;
        }
      }

      await db.update(schema.cards).set({ scheduledAt: new Date(currentTime) }).where(eq(schema.cards.id, card.id));

      // Create event in Google Calendar (CalDAV)
      // Check if we need to delete an old one? Auto-schedule usually runs on backlog, but just in case
      if (card.externalEventId) {
          await deleteCalendarEvent(card.externalEventId);
      }
      const eventId = await createCalendarEvent(`[Prios] ${card.title}`, new Date(currentTime), card.difficulty * 30);

      await db.update(schema.cards).set({ scheduledAt: new Date(currentTime), externalEventId: eventId }).where(eq(schema.cards.id, card.id));

      results.push({ id: card.id, title: card.title, scheduledAt: new Date(currentTime) });
      scheduledIds.add(card.id);

      currentTime += durationMs + (10 * 60 * 1000);
    }

    return { success: true, scheduledTasks: results };
  });

  // Calendar Sync
  fastify.post('/calendar/sync', async (request) => {
    // 1. Get all cards that are scheduled and have an externalEventId
    const scheduledCards = await db.select()
      .from(schema.cards)
      .innerJoin(schema.statuses, eq(schema.cards.statusId, schema.statuses.id))
      .where(and(
        eq(schema.statuses.category, 'scheduled'),
        isNotNull(schema.cards.externalEventId) // Is Not Null check
      ));

    if (scheduledCards.length === 0) return { synced: 0, moved: 0, deleted: 0 };

    // Calculate time range to fetch from Google
    const timestamps = scheduledCards.map(c => c.cards.scheduledAt?.getTime() || 0).filter(t => t > 0);
    if (timestamps.length === 0) return { synced: 0, moved: 0, deleted: 0 };

    const minTime = new Date(Math.min(...timestamps));
    const maxTime = new Date(Math.max(...timestamps));
    // Add buffers
    minTime.setHours(0,0,0,0);
    maxTime.setHours(23,59,59,999);
    // Extend maxTime to cover potential moves? For now just day scope.
    // Better to fetch +/- 7 days or simpler: fetch broad range
    maxTime.setDate(maxTime.getDate() + 7);
    minTime.setDate(minTime.getDate() - 1);

    const events = await getCalendarEvents(minTime, maxTime);

    let synced = 0;
    let moved = 0;
    let deleted = 0;

    for (const card of scheduledCards) {
      if (!card.cards.externalEventId) continue;

      // Find matching event
      const event = events.find((e: any) => e.uid === card.cards.externalEventId || (e.uid && card.cards.externalEventId && e.uid.includes(card.cards.externalEventId)) || (card.cards.externalEventId && e.uid && card.cards.externalEventId.includes(e.uid)));

      if (!event) {
          // Event deleted in Calendar -> Move to Maybe status, clear scheduledAt and externalEventId.
          const maybeStatus = await db.select().from(schema.statuses).where(and(eq(schema.statuses.boardId, card.cards.boardId), eq(schema.statuses.category, 'maybe')));
          if (maybeStatus[0]) {
              await db.update(schema.cards).set({
                  statusId: maybeStatus[0].id,
                  scheduledAt: null,
                  externalEventId: null
              }).where(eq(schema.cards.id, card.cards.id));
              deleted++;
          }
      } else {
          // Check for move
          const eventStart = new Date(event.start.dateTime).getTime();
          const currentStart = card.cards.scheduledAt?.getTime();

          // Tolerance of 1 minute
          if (!currentStart || Math.abs(eventStart - currentStart) > 60000) {
               await db.update(schema.cards).set({
                  scheduledAt: new Date(eventStart)
               }).where(eq(schema.cards.id, card.cards.id));
               moved++;
          } else {
              synced++;
          }
      }
    }

    return { synced, moved, deleted };
  });
};

export default calendarRoutes;
