import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// 예배 유형 (주일 1부, 2부, 3부, 수요, 청년, 특별 등)
export const worshipTypes = sqliteTable('worship_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
});

// 역할 (인도자, 건반, 드럼, 기타, 베이스, 보컬, 목사님)
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
});

// 프로필 (참여자)
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  roleId: text('role_id')
    .notNull()
    .references(() => roles.id),
  color: text('color').notNull(),
});

// 커맨드 (1절, 2절, 한번 더, 시작, 정지 등)
export const commands = sqliteTable('commands', {
  id: text('id').primaryKey(),
  emoji: text('emoji').notNull(),
  label: text('label').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
});

// 예배
export const worships = sqliteTable('worships', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  date: text('date').notNull(),
  typeId: text('type_id')
    .notNull()
    .references(() => worshipTypes.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 악보 시트
export const sheets = sqliteTable('sheets', {
  id: text('id').primaryKey(),
  worshipId: text('worship_id')
    .notNull()
    .references(() => worships.id),
  fileName: text('file_name').notNull(),
  title: text('title').notNull(),
  imagePath: text('image_path').notNull(),
  order: integer('order').notNull(),
  createdAt: text('created_at').notNull(),
});

// 드로잉 경로 (악보 위 필기)
export const drawingPaths = sqliteTable('drawing_paths', {
  id: text('id').primaryKey(),
  sheetId: text('sheet_id')
    .notNull()
    .references(() => sheets.id),
  profileId: text('profile_id'),
  color: text('color').notNull(),
  width: real('width').notNull(),
  points: text('points').notNull(), // JSON string
  isEraser: integer('is_eraser', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});
