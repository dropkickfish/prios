import { pgTable, text, integer, boolean, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { v4 as uuidv4 } from 'uuid';

export const boards = pgTable('boards', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  name: text('name').notNull(),
  availabilitySchedule: jsonb('availability_schedule').notNull(), // { mon: ["09:00-17:00"], ... }
  order: integer('order').notNull().default(0),
  colour: text('colour'),
  schedulingWindowDays: integer('scheduling_window_days').default(3).notNull(),
});

export const statuses = pgTable('statuses', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  boardId: text('board_id').notNull().references(() => boards.id),
  name: text('name').notNull(),
  order: integer('order').notNull(),
  category: text('category').$type<'maybe' | 'scheduled' | 'doing' | 'done' | 'wontdo'>().notNull(),
});

export const cards = pgTable('cards', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  boardId: text('board_id').notNull().references(() => boards.id),
  statusId: text('status_id').notNull().references(() => statuses.id),
  title: text('title').notNull(),
  description: jsonb('description'), // Slate.js JSON format
  difficulty: integer('difficulty').notNull(), // 1-5
  priority: integer('priority').notNull(), // 1-5
  scheduledAt: timestamp('scheduled_at'),
  externalEventId: text('external_event_id'),
  deferredCount: integer('deferred_count').default(0).notNull(),
  statusChangedAt: timestamp('status_changed_at'),
});

export const tags = pgTable('tags', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  boardId: text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  colour: text('colour'),
});

export const cardTags = pgTable('card_tags', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  cardId: text('card_id').notNull().references(() => cards.id),
  tagId: text('tag_id').notNull().references(() => tags.id),
});

export const cardUpdates = pgTable('card_updates', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  cardId: text('card_id').notNull().references(() => cards.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
});

export const cardMedia = pgTable('card_media', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  cardId: text('card_id').notNull().references(() => cards.id),
  url: text('url').notNull(),
  type: text('type').notNull(),
});

export const dependencies = pgTable('dependencies', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  blockingCardId: text('blocking_card_id').notNull().references(() => cards.id),
  blockedCardId: text('blocked_card_id').notNull().references(() => cards.id),
});

export const userStats = pgTable('user_stats', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  difficultySum: integer('difficulty_sum').default(0),
  prioritySum: integer('priority_sum').default(0),
  completedCount: integer('completed_count').default(0),
  abandonedCount: integer('abandoned_count').default(0),
  skippedCount: integer('skipped_count').default(0),
  isDayOff: boolean('is_day_off').default(false),
});

export const appSettings = pgTable('app_settings', {
  id: text('id').primaryKey().$defaultFn(() => 'singleton'),
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiry: integer('google_token_expiry'),
  googleCalendarId: text('google_calendar_id').default('primary'),
  apiKeyHash: text('api_key_hash'),
  apiKeyHint: text('api_key_hint'),
});

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
});

export const oauthAccounts = pgTable('oauth_accounts', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerId: text('provider_id').notNull(),
  email: text('email'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
}, (t) => [unique().on(t.provider, t.providerId)]);

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').notNull().unique(),
  userAgent: text('user_agent'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  lastUsedAt: integer('last_used_at').notNull().$defaultFn(() => Date.now()),
  expiresAt: integer('expires_at').notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  hash: text('hash').notNull().unique(),
  hint: text('hint').notNull(),
  expiresAt: integer('expires_at'),
  lastUsedAt: integer('last_used_at'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
});

export const attachments = pgTable('attachments', {
  id: text('id').primaryKey().$defaultFn(() => uuidv4()),
  cardId: text('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
});
