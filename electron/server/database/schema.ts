import { integer, sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
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

// 주석 데이터 (SVG 벡터 기반)
export const annotations = sqliteTable('annotations', {
  id: integer('id').primaryKey(),
  songId: integer('song_id').references(() => songs.id).notNull(),
  userId: text('user_id').notNull(),       // "user-123"
  userName: text('user_name').notNull(),   // "김찬양"
  layer: text('layer').notNull(),          // "김찬양의 주석"
  svgPath: text('svg_path').notNull(),     // SVG 패스 데이터 (압축됨)
  color: text('color').notNull(),          // "#ff0000"
  tool: text('tool').notNull(),            // "pen" | "highlighter" | "eraser"
  strokeWidth: real('stroke_width'),       // 선 두께
  opacity: real('opacity').default(1.0),  // 투명도 (0.0 - 1.0)
  isVisible: integer('is_visible', { mode: 'boolean' }).default(true), // 가시성 플래그
  version: integer('version').default(1),  // 버전 관리
  compressedSize: integer('compressed_size'), // 압축된 데이터 크기 (바이트)
  checksum: text('checksum'),              // 무결성 체크용 해시
  deletedAt: text('deleted_at'),           // Soft delete (null이면 활성)
  updatedAt: text('updated_at').default(sql`datetime('now')`),
  createdAt: text('created_at').default(sql`datetime('now')`),
}, (table) => ({
  // 성능 최적화를 위한 인덱스들
  songUserIdx: index('idx_annotations_song_user').on(table.songId, table.userId),
  songActiveIdx: index('idx_annotations_song_active').on(table.songId, table.deletedAt),
  userActiveIdx: index('idx_annotations_user_active').on(table.userId, table.deletedAt),
  createdAtIdx: index('idx_annotations_created_at').on(table.createdAt),
}));

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
