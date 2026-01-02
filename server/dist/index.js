import Fastify from 'fastify';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { eq, and, or, desc } from 'drizzle-orm';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import { DAVClient } from 'tsdav';
dotenv.config();
// Note: We use manual fetch for OAuth code exchange since we removed googleapis
const GOOGLE_AUTH_ENDPOINT = 'https://oauth2.googleapis.com';
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
// Google Auth Routes
fastify.get('/api/auth/google/url', async () => {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
        access_type: 'offline',
        prompt: 'consent',
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return { url };
});
fastify.get('/api/auth/google/callback', async (request, reply) => {
    const { code } = request.query;
    const tokenRes = await fetch(`${GOOGLE_AUTH_ENDPOINT}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
        }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) {
        throw new Error(tokens.error_description || tokens.error);
    }
    await db.insert(schema.appSettings).values({
        id: 'singleton',
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: Date.now() + (tokens.expires_in * 1000),
    }).onConflictDoUpdate({
        target: schema.appSettings.id,
        set: {
            googleAccessToken: tokens.access_token,
            googleRefreshToken: tokens.refresh_token,
            googleTokenExpiry: Date.now() + (tokens.expires_in * 1000),
        }
    });
    return reply.type('text/html').send(`
    <html>
      <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
        <h1 style="color: #38bdf8;">Connected!</h1>
        <p>You can close this window now.</p>
        <script>
          if (window.opener) {
            window.opener.postMessage('google-auth-success', '*');
          }
          setTimeout(() => window.close(), 2000);
        </script>
      </body>
    </html>
  `);
});
fastify.get('/api/auth/google/status', async () => {
    const settings = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, 'singleton'));
    return { connected: !!settings[0]?.googleRefreshToken };
});
fastify.delete('/api/auth/google', async () => {
    await db.update(schema.appSettings).set({
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
    }).where(eq(schema.appSettings.id, 'singleton'));
    return { success: true };
});
// CalDAV Helper
async function getCalendarEvents(startTime, endTime) {
    const settings = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, 'singleton'));
    if (!settings[0] || !settings[0].googleRefreshToken) {
        fastify.log.warn('No Google settings found');
        return [];
    }
    try {
        const client = new DAVClient({
            serverUrl: 'https://apidata.googleusercontent.com/caldav/v2/',
            credentials: {
                accessToken: settings[0].googleAccessToken,
                refreshToken: settings[0].googleRefreshToken,
                expiration: settings[0].googleTokenExpiry,
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
            authMethod: 'Oauth',
            defaultAccountType: 'caldav',
        });
        await client.login();
        const calendars = await client.fetchCalendars();
        const primary = calendars.find(c => c.url.includes('primary') || c.url.includes(settings[0].googleCalendarId || '')) || calendars[0];
        const events = await client.fetchCalendarObjects({
            calendar: primary,
            timeRange: {
                start: startTime.toISOString(),
                end: endTime.toISOString(),
            },
        });
        return events.map(e => {
            const summary = e.data?.match(/SUMMARY:(.*)/)?.[1]?.trim() || 'Untitled';
            const startStr = e.data?.match(/DTSTART[:;](?:.*:)?(.*)/)?.[1]?.trim();
            const endStr = e.data?.match(/DTEND[:;](?:.*:)?(.*)/)?.[1]?.trim();
            return {
                summary,
                start: { dateTime: startStr ? new Date(startStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z')) : startTime },
                end: { dateTime: endStr ? new Date(endStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z')) : endTime },
            };
        });
    }
    catch (error) {
        fastify.log.error('getCalendarEvents failed:', error.message);
        throw error;
    }
}
async function createCalendarEvent(summary, startTime, endTime) {
    const settings = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, 'singleton'));
    if (!settings[0] || !settings[0].googleRefreshToken)
        return;
    const client = new DAVClient({
        serverUrl: 'https://apidata.googleusercontent.com/caldav/v2/',
        credentials: {
            accessToken: settings[0].googleAccessToken,
            refreshToken: settings[0].googleRefreshToken,
            expiration: settings[0].googleTokenExpiry,
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
        authMethod: 'Oauth',
        defaultAccountType: 'caldav',
    });
    await client.login();
    const calendars = await client.fetchCalendars();
    const primary = calendars.find(c => c.url.includes('primary') || c.url.includes(settings[0].googleCalendarId || '')) || calendars[0];
    const format = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const iCalData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${summary}
DTSTART:${format(startTime)}
DTEND:${format(endTime)}
END:VEVENT
END:VCALENDAR`;
    await client.createCalendarObject({
        calendar: primary,
        filename: `${Date.now()}.ics`,
        iCalString: iCalData,
    });
}
fastify.get('/api/calendar/availability', async (request) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const events = await getCalendarEvents(todayStart, todayEnd);
    // Basic busy slots extraction
    const busySlots = events.map((event) => ({
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        title: event.summary,
    }));
    return { busySlots };
});
// Scheduling Engine
fastify.post('/api/scheduler/auto', async (request) => {
    const { boardId } = request.body;
    // 1. Get cards that need scheduling (e.g., in 'maybe' category)
    const cardsToSchedule = await db.select()
        .from(schema.cards)
        .innerJoin(schema.statuses, eq(schema.cards.statusId, schema.statuses.id))
        .where(and(eq(schema.cards.boardId, boardId), eq(schema.statuses.category, 'maybe')));
    // Get dependencies for these cards
    const allCardIds = cardsToSchedule.map(c => c.cards.id);
    const cardDeps = await db.select().from(schema.dependencies).where(or(...allCardIds.map(id => eq(schema.dependencies.blockedCardId, id))));
    // 2. Get busy slots from Google Calendar
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const events = await getCalendarEvents(todayStart, todayEnd);
    const busySlots = events.map((event) => ({
        start: new Date(event.start.dateTime || event.start.date).getTime(),
        end: new Date(event.end.dateTime || event.end.date).getTime(),
    }));
    // 3. Scheduling Logic: Topological Sort + Priority
    let currentTime = Date.now();
    const results = [];
    const scheduledIds = new Set();
    // Create a dependency map
    const depsMap = new Map();
    cardDeps.forEach(d => {
        if (!depsMap.has(d.blockedCardId))
            depsMap.set(d.blockedCardId, []);
        depsMap.get(d.blockedCardId).push(d.blockingCardId);
    });
    // Sort by priority initially
    let remaining = cardsToSchedule.sort((a, b) => b.cards.priority - a.cards.priority);
    while (remaining.length > 0) {
        // Find tasks whose dependencies are already scheduled OR not in this set
        const readyIdx = remaining.findIndex(item => {
            const blockers = depsMap.get(item.cards.id) || [];
            return blockers.every((bid) => scheduledIds.has(bid) || !allCardIds.includes(bid));
        });
        if (readyIdx === -1)
            break; // Circular dependency or stuck
        const item = remaining.splice(readyIdx, 1)[0];
        const card = item.cards;
        const durationMs = card.difficulty * 30 * 60 * 1000;
        let foundSlot = false;
        while (!foundSlot) {
            const slotEnd = currentTime + durationMs;
            const conflict = busySlots.find(s => (currentTime < s.end && slotEnd > s.start));
            if (conflict) {
                currentTime = conflict.end + (5 * 60 * 1000); // 5 min buffer
            }
            else {
                foundSlot = true;
            }
        }
        await db.update(schema.cards).set({ scheduledAt: new Date(currentTime) }).where(eq(schema.cards.id, card.id));
        // Create event in Google Calendar (CalDAV)
        await createCalendarEvent(`[Prios] ${card.title}`, new Date(currentTime), new Date(currentTime + durationMs));
        results.push({ id: card.id, title: card.title, scheduledAt: new Date(currentTime) });
        scheduledIds.add(card.id);
        currentTime += durationMs + (10 * 60 * 1000);
    }
    return { success: true, scheduledTasks: results };
});
// Helper for stats
async function getOrCreateTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    const existing = await db.select().from(schema.userStats).where(eq(schema.userStats.date, today));
    if (existing[0])
        return existing[0];
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
    const { name, availabilitySchedule } = request.body;
    const result = await db.insert(schema.boards).values({
        name,
        availabilitySchedule,
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
fastify.delete('/api/boards/:id', async (request) => {
    const { id } = request.params;
    // Note: For a production app, we'd handle cascading deletes or prevent deletion if cards exist.
    // For MVP, we'll just delete the board.
    await db.delete(schema.boards).where(eq(schema.boards.id, id));
    return { success: true };
});
// Statuses
fastify.get('/api/boards/:boardId/statuses', async (request) => {
    const { boardId } = request.params;
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
fastify.post('/api/boards/:boardId/statuses', async (request) => {
    const { boardId } = request.params;
    const { name, order, category } = request.body;
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
    const { boardId } = request.params;
    return await db.select().from(schema.cards).where(eq(schema.cards.boardId, boardId));
});
fastify.get('/api/cards/:id', async (request, reply) => {
    const { id } = request.params;
    const card = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
    if (!card[0])
        return reply.status(404).send({ error: 'Card not found' });
    return card[0];
});
fastify.post('/api/boards/:boardId/cards', async (request) => {
    const { boardId } = request.params;
    const { statusId, title, description, difficulty, priority } = request.body;
    const targetStatus = await db.select().from(schema.statuses).where(eq(schema.statuses.id, statusId));
    if (!targetStatus[0])
        throw new Error('Status not found');
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
    const { id } = request.params;
    const updates = request.body;
    // If changing status, run constraints
    if (updates.statusId) {
        const card = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
        if (!card[0])
            return reply.status(404).send({ error: 'Card not found' });
        const targetStatus = await db.select().from(schema.statuses).where(eq(schema.statuses.id, updates.statusId));
        if (!targetStatus[0])
            return reply.status(400).send({ error: 'Target status not found' });
        if (targetStatus[0].category === 'doing') {
            // 1. Max 1 Doing Constraint
            const existingDoing = await db.select()
                .from(schema.cards)
                .innerJoin(schema.statuses, eq(schema.cards.statusId, schema.statuses.id))
                .where(and(eq(schema.cards.boardId, card[0].boardId), eq(schema.statuses.category, 'doing')));
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
fastify.post('/api/cards/:id/schedule', async (request, reply) => {
    const { id } = request.params;
    const cardResult = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
    if (!cardResult[0])
        return reply.status(404).send({ error: 'Card not found' });
    const card = cardResult[0];
    // 1. Get busy slots
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const events = await getCalendarEvents(todayStart, todayEnd);
    const busySlots = events.map((event) => ({
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
        }
        else {
            foundSlot = true;
        }
    }
    // 3. Find 'scheduled' status for this board
    const scheduledStatus = await db.select()
        .from(schema.statuses)
        .where(and(eq(schema.statuses.boardId, card.boardId), eq(schema.statuses.category, 'scheduled')));
    if (!scheduledStatus[0])
        return reply.status(400).send({ error: 'No "Scheduled" status lane found on this board.' });
    // 4. Update card
    await db.update(schema.cards).set({
        scheduledAt: new Date(currentTime),
        statusId: scheduledStatus[0].id
    }).where(eq(schema.cards.id, id));
    // 5. Create Calendar Event
    await createCalendarEvent(`[Prios] ${card.title}`, new Date(currentTime), new Date(currentTime + durationMs));
    return { success: true, scheduledAt: new Date(currentTime) };
});
fastify.delete('/api/cards/:id', async (request) => {
    const { id } = request.params;
    await db.delete(schema.cards).where(eq(schema.cards.id, id));
    return { success: true };
});
// Card Updates
fastify.get('/api/cards/:cardId/updates', async (request) => {
    const { cardId } = request.params;
    return await db.select().from(schema.cardUpdates).where(eq(schema.cardUpdates.cardId, cardId)).orderBy(desc(schema.cardUpdates.createdAt));
});
fastify.post('/api/cards/:cardId/updates', async (request) => {
    const { cardId } = request.params;
    const { content } = request.body;
    const result = await db.insert(schema.cardUpdates).values({
        cardId,
        content,
    }).returning();
    return result[0];
});
// Dependencies
fastify.get('/api/cards/:cardId/dependencies', async (request) => {
    const { cardId } = request.params;
    return await db.select().from(schema.dependencies).where(or(eq(schema.dependencies.blockingCardId, cardId), eq(schema.dependencies.blockedCardId, cardId)));
});
fastify.post('/api/dependencies', async (request) => {
    const { blockingCardId, blockedCardId } = request.body;
    const result = await db.insert(schema.dependencies).values({
        blockingCardId,
        blockedCardId,
    }).returning();
    return result[0];
});
fastify.delete('/api/dependencies/:id', async (request) => {
    const { id } = request.params;
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
        }
        else {
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
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
