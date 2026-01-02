import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { eq } from 'drizzle-orm';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite, { schema });

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

  console.log('✅ Seeding complete.');
  sqlite.close();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
