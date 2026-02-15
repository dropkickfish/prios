import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { eq } from 'drizzle-orm';
const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite, { schema });
const SEED_TEST_DATA = process.env.SEED_TEST_DATA === '1' || process.env.SEED_TEST_DATA === 'true';
async function seed() {
    console.log('🌱 Seeding database...');
    // 1. Ensure singleton app settings exist
    const existingSettings = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, 'singleton'));
    if (existingSettings.length === 0) {
        console.log('Creating singleton app settings...');
        await db.insert(schema.appSettings).values({
            id: 'singleton',
            googleCalendarId: 'primary',
        });
    }
    // 2. Ensure at least one board exists
    const existingBoards = await db.select().from(schema.boards);
    if (existingBoards.length === 0) {
        console.log('Creating default Welcome Board...');
        const boardResult = await db.insert(schema.boards).values({
            name: 'Welcome Board',
            availabilitySchedule: {
                mon: ['09:00-17:00'],
                tue: ['09:00-17:00'],
                wed: ['09:00-17:00'],
                thu: ['09:00-17:00'],
                fri: ['09:00-17:00'],
                sat: [],
                sun: [],
            },
        }).returning();
        const board = boardResult[0];
        // 3. Create default statuses for the Welcome Board
        console.log('Creating default statuses for Welcome Board...');
        await db.insert(schema.statuses).values([
            { boardId: board.id, name: 'Maybe', order: 1, category: 'maybe' },
            { boardId: board.id, name: 'Scheduled', order: 2, category: 'scheduled' },
            { boardId: board.id, name: 'Doing', order: 3, category: 'doing' },
            { boardId: board.id, name: 'Done', order: 4, category: 'done' },
            { boardId: board.id, name: "Won't Do", order: 5, category: 'wontdo' },
        ]);
    }
    // 4. Optional: test data for demos and functional testing
    if (SEED_TEST_DATA) {
        console.log('Adding test data (boards, cards, stats)...');
        const boards = await db.select().from(schema.boards).orderBy(schema.boards.order);
        const board = boards[0];
        const statuses = await db.select().from(schema.statuses).where(eq(schema.statuses.boardId, board.id)).orderBy(schema.statuses.order);
        const maybeStatus = statuses.find(s => s.category === 'maybe');
        const scheduledStatus = statuses.find(s => s.category === 'scheduled');
        const doingStatus = statuses.find(s => s.category === 'doing');
        const doneStatus = statuses.find(s => s.category === 'done');
        const existingCards = await db.select().from(schema.cards).where(eq(schema.cards.boardId, board.id));
        if (existingCards.length === 0) {
            await db.insert(schema.cards).values([
                { boardId: board.id, statusId: maybeStatus.id, title: 'Review PR #42', description: null, difficulty: 2, priority: 4 },
                { boardId: board.id, statusId: maybeStatus.id, title: 'Write design doc', description: null, difficulty: 4, priority: 3 },
                { boardId: board.id, statusId: maybeStatus.id, title: 'Fix login bug', description: null, difficulty: 1, priority: 5 },
                { boardId: board.id, statusId: scheduledStatus.id, title: 'Team standup prep', description: null, difficulty: 1, priority: 3 },
                { boardId: board.id, statusId: doingStatus.id, title: 'Ship Prios PWA', description: null, difficulty: 3, priority: 5 },
                { boardId: board.id, statusId: doneStatus.id, title: 'Setup project', description: null, difficulty: 2, priority: 4 },
                { boardId: board.id, statusId: doneStatus.id, title: 'Deploy staging', description: null, difficulty: 2, priority: 3 },
            ]);
        }
        // Seed last 7 days of user_stats so Stats view shows activity
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const existing = await db.select().from(schema.userStats).where(eq(schema.userStats.date, dateStr));
            if (existing.length === 0) {
                await db.insert(schema.userStats).values({
                    date: dateStr,
                    completedCount: i === 0 ? 0 : Math.floor(Math.random() * 4) + 1,
                    abandonedCount: Math.floor(Math.random() * 2),
                    skippedCount: Math.floor(Math.random() * 2),
                    difficultySum: 5,
                    prioritySum: 10,
                    isDayOff: false,
                });
            }
        }
        console.log('Test data added.');
    }
    console.log('✅ Seeding complete.');
    sqlite.close();
}
seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
