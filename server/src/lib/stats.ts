import { db, schema } from '../db.js';
import { eq } from 'drizzle-orm';

export async function getOrCreateTodayStats() {
  const today = new Date().toISOString().split('T')[0];
  const existing = await db.select().from(schema.userStats).where(eq(schema.userStats.date, today));
  if (existing[0]) return existing[0];

  const result = await db.insert(schema.userStats).values({
    date: today,
    completedCount: 0,
    abandonedCount: 0,
    difficultySum: 0,
    prioritySum: 0,
    skippedCount: 0,
    isDayOff: false,
  }).returning();
  return result[0];
}
