import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// 악기 테이블
export const instruments = sqliteTable('instruments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// 사용자 테이블
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role', { enum: ['session', 'leader', 'admin'] }).notNull(),
  instrumentId: text('instrument_id')
    .notNull()
    .references(() => instruments.id),
  avatar: text('avatar'),
  customCommands: text('custom_commands'), // JSON 배열로 저장
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// 예배 유형 테이블
export const worshipTypes = sqliteTable('worship_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// 예배 테이블
export const worships = sqliteTable('worships', {
  id: text('id').primaryKey(),
  typeId: text('type_id')
    .notNull()
    .references(() => worshipTypes.id),
  name: text('name').notNull(),
  date: text('date').notNull(), // DATE 타입은 text로 저장
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// 악보 테이블
export const scores = sqliteTable('scores', {
  id: text('id').primaryKey(),
  worshipId: text('worship_id')
    .notNull()
    .references(() => worships.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  filePath: text('file_path').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// 드로잉 데이터 테이블
export const scoreDrawings = sqliteTable('score_drawings', {
  id: text('id').primaryKey(),
  scoreId: text('score_id')
    .notNull()
    .references(() => scores.id, { onDelete: 'cascade' }),
  pageNumber: integer('page_number').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  drawingType: text('drawing_type').notNull(), // 'pen', 'highlighter', 'eraser' 등
  drawingData: text('drawing_data').notNull(), // JSON으로 저장
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// 명령 이력 테이블
export const commands = sqliteTable('commands', {
  id: text('id').primaryKey(),
  senderId: text('sender_id')
    .notNull()
    .references(() => users.id),
  worshipId: text('worship_id')
    .notNull()
    .references(() => worships.id),
  content: text('content').notNull(),
  targetType: text('target_type', { enum: ['all', 'group', 'individual'] }).notNull(),
  targetIds: text('target_ids'), // JSON 배열로 저장 (특정 대상인 경우)
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  expiresAt: text('expires_at').notNull(),
});

// 시스템 설정 테이블
export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// 관계 정의
export const instrumentsRelations = relations(instruments, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  instrument: one(instruments, {
    fields: [users.instrumentId],
    references: [instruments.id],
  }),
  scoreDrawings: many(scoreDrawings),
  sentCommands: many(commands),
}));

export const worshipTypesRelations = relations(worshipTypes, ({ many }) => ({
  worships: many(worships),
}));

export const worshipsRelations = relations(worships, ({ one, many }) => ({
  type: one(worshipTypes, {
    fields: [worships.typeId],
    references: [worshipTypes.id],
  }),
  scores: many(scores),
  commands: many(commands),
}));

export const scoresRelations = relations(scores, ({ one, many }) => ({
  worship: one(worships, {
    fields: [scores.worshipId],
    references: [worships.id],
  }),
  drawings: many(scoreDrawings),
}));

export const scoreDrawingsRelations = relations(scoreDrawings, ({ one }) => ({
  score: one(scores, {
    fields: [scoreDrawings.scoreId],
    references: [scores.id],
  }),
  user: one(users, {
    fields: [scoreDrawings.userId],
    references: [users.id],
  }),
}));

export const commandsRelations = relations(commands, ({ one }) => ({
  sender: one(users, {
    fields: [commands.senderId],
    references: [users.id],
  }),
  worship: one(worships, {
    fields: [commands.worshipId],
    references: [worships.id],
  }),
}));

// 타입 추론
export type Instrument = typeof instruments.$inferSelect;
export type InsertInstrument = typeof instruments.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type WorshipType = typeof worshipTypes.$inferSelect;
export type InsertWorshipType = typeof worshipTypes.$inferInsert;

export type Worship = typeof worships.$inferSelect;
export type InsertWorship = typeof worships.$inferInsert;

export type Score = typeof scores.$inferSelect;
export type InsertScore = typeof scores.$inferInsert;

export type ScoreDrawing = typeof scoreDrawings.$inferSelect;
export type InsertScoreDrawing = typeof scoreDrawings.$inferInsert;

export type Command = typeof commands.$inferSelect;
export type InsertCommand = typeof commands.$inferInsert;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
