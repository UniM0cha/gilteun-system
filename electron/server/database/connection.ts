// Kysely 데이터베이스 연결 설정

import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import path from 'path';
import { app } from 'electron';
import type { Database as DatabaseSchema } from './types.js';

let db: Kysely<DatabaseSchema> | null = null;

// 데이터베이스 파일 경로
function getDatabasePath(): string {
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'gilteun-system.db');
  }
  return path.join(app.getPath('userData'), 'gilteun-system.db');
}

// 데이터베이스 인스턴스 가져오기
export function getDatabase(): Kysely<DatabaseSchema> {
  if (!db) {
    throw new Error('데이터베이스가 초기화되지 않았습니다. initializeDatabase()를 먼저 호출하세요.');
  }
  return db;
}

// 데이터베이스 초기화
export async function initializeDatabase(): Promise<void> {
  const dbPath = getDatabasePath();

  const sqliteDb = new Database(dbPath);

  db = new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database: sqliteDb,
    }),
  });

  // 테이블 생성
  await createTables();

  console.log('[DB] 데이터베이스 초기화 완료:', dbPath);
}

// 테이블 생성
async function createTables(): Promise<void> {
  if (!db) return;

  // profiles 테이블
  await db.schema
    .createTable('profiles')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('role', 'text', (col) => col.notNull())
    .addColumn('icon', 'text', (col) => col.notNull())
    .addColumn('color', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addColumn('deleted_at', 'text')
    .execute();

  // worships 테이블
  await db.schema
    .createTable('worships')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('date', 'text', (col) => col.notNull())
    .addColumn('time', 'text')
    .addColumn('memo', 'text')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addColumn('deleted_at', 'text')
    .execute();

  // songs 테이블
  await db.schema
    .createTable('songs')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('worship_id', 'text', (col) => col.notNull().references('worships.id'))
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('key', 'text')
    .addColumn('memo', 'text')
    .addColumn('image_path', 'text')
    .addColumn('order_index', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addColumn('deleted_at', 'text')
    .execute();

  // annotations 테이블
  await db.schema
    .createTable('annotations')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('song_id', 'text', (col) => col.notNull().references('songs.id'))
    .addColumn('profile_id', 'text', (col) => col.notNull().references('profiles.id'))
    .addColumn('svg_path', 'text', (col) => col.notNull())
    .addColumn('color', 'text', (col) => col.notNull())
    .addColumn('tool', 'text', (col) => col.notNull())
    .addColumn('stroke_width', 'real')
    .addColumn('metadata', 'text')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addColumn('deleted_at', 'text')
    .execute();

  // commands 테이블
  await db.schema
    .createTable('commands')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('worship_id', 'text', (col) => col.notNull().references('worships.id'))
    .addColumn('profile_id', 'text', (col) => col.notNull().references('profiles.id'))
    .addColumn('message', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();
}

// 데이터베이스 종료
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
    console.log('[DB] 데이터베이스 연결 종료');
  }
}
