import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { v4 as uuidv4 } from 'uuid';

export const boards = sqliteTable('boards', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  name: text('name').notNull(),
  availabilitySchedule: text('availability_schedule', { mode: 'json' }).notNull(), // JSON: { mon: ["09:00-17:00"], ... }
  order: integer('order').notNull().default(0),
});

export const statuses = sqliteTable('statuses', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  boardId: text('board_id').notNull().references(() => boards.id),
  name: text('name').notNull(),
  order: integer('order').notNull(),
  category: text('category', { enum: ['maybe', 'scheduled', 'doing', 'done', 'wontdo'] }).notNull(),
});

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  boardId: text('board_id').notNull().references(() => boards.id),
  statusId: text('status_id').notNull().references(() => statuses.id),
  title: text('title').notNull(),
  description: text('description', { mode: 'json' }), // Slate.js JSON format
  difficulty: integer('difficulty').notNull(), // 1-5
  priority: integer('priority').notNull(), // 1-5
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
});

export const cardUpdates = sqliteTable('card_updates', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  cardId: text('card_id').notNull().references(() => cards.id),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const cardMedia = sqliteTable('card_media', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  cardId: text('card_id').notNull().references(() => cards.id),
  url: text('url').notNull(),
  type: text('type').notNull(), // e.g., 'image/png', 'video/mp4'
});

export const dependencies = sqliteTable('dependencies', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  blockingCardId: text('blocking_card_id').notNull().references(() => cards.id),
  blockedCardId: text('blocked_card_id').notNull().references(() => cards.id),
});

export const userStats = sqliteTable('user_stats', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  difficultySum: integer('difficulty_sum').default(0),
  prioritySum: integer('priority_sum').default(0),
  completedCount: integer('completed_count').default(0),
  abandonedCount: integer('abandoned_count').default(0),
  isDayOff: integer('is_day_off', { mode: 'boolean' }).default(false),
});

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey().$defaultFn(() => 'singleton'), // Only one row
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiry: integer('google_token_expiry'),
  googleCalendarId: text('google_calendar_id').default('primary'),
});
