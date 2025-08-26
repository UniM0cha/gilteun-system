import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// 예배 정보
export const worships = sqliteTable('worships', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),           // "3월 15일 금요 기도회"
  date: text('date').notNull(),             // "2024-03-15"
  time: text('time'),                       // "19:30"
  description: text('description'),         // "특별 기도 시간"
  createdAt: text('created_at').default(sql`datetime('now')`),
});

// 찬양 정보
export const songs = sqliteTable('songs', {
  id: integer('id').primaryKey(),
  worshipId: integer('worship_id').references(() => worships.id),
  title: text('title').notNull(),          // "주 은혜임을"
  key: text('key'),                        // "G"
  memo: text('memo'),                      // "2절 후 간주 길게"
  imagePath: text('image_path'),           // "./uploads/song1.jpg"
  order: integer('order'),                 // 1, 2, 3...
  createdAt: text('created_at').default(sql`datetime('now')`),
});

// 주석 데이터 (벡터 기반)
export const annotations = sqliteTable('annotations', {
  id: integer('id').primaryKey(),
  songId: integer('song_id').references(() => songs.id),
  userId: text('user_id').notNull(),       // "user-123"
  userName: text('user_name').notNull(),   // "김찬양"
  layer: text('layer').notNull(),          // "김찬양의 주석"
  svgPath: text('svg_path').notNull(),     // SVG 패스 데이터
  color: text('color'),                    // "#ff0000"
  tool: text('tool'),                      // "pen" | "highlighter" | "eraser"
  createdAt: text('created_at').default(sql`datetime('now')`),
});

// 사용자 정보 (세션용)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),             // "user-123"
  name: text('name').notNull(),            // "김찬양"
  createdAt: text('created_at').default(sql`datetime('now')`),
  lastActiveAt: text('last_active_at').default(sql`datetime('now')`),
});

// 명령 히스토리
export const commands = sqliteTable('commands', {
  id: integer('id').primaryKey(),
  userId: text('user_id').notNull(),       // 명령 전송자
  userName: text('user_name').notNull(),   // 전송자 이름  
  message: text('message').notNull(),      // 명령 내용
  createdAt: text('created_at').default(sql`datetime('now')`),
});

// TypeScript 타입 추론용
export type Worship = typeof worships.$inferSelect;
export type NewWorship = typeof worships.$inferInsert;

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;

export type Annotation = typeof annotations.$inferSelect;
export type NewAnnotation = typeof annotations.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Command = typeof commands.$inferSelect;
export type NewCommand = typeof commands.$inferInsert;
