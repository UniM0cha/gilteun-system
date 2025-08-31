import { Generated, ColumnType } from 'kysely';

/**
 * 예배 정보 테이블
 */
export interface WorshipsTable {
  id: Generated<number>;
  title: string;
  date: string;
  time: string | null;
  description: string | null;
  created_at: ColumnType<string, string | undefined, never>;
}

/**
 * 찬양 정보 테이블
 */
export interface SongsTable {
  id: Generated<number>;
  worship_id: number | null;
  title: string;
  key: string | null;
  memo: string | null;
  image_path: string | null;
  order: number | null;
  created_at: ColumnType<string, string | undefined, never>;
}

/**
 * 주석 데이터 테이블 (SVG 벡터 기반)
 */
export interface AnnotationsTable {
  id: Generated<number>;
  song_id: number;
  user_id: string;
  user_name: string;
  layer: string;
  svg_path: string;
  color: string;
  tool: string;
  stroke_width: number | null;
  opacity: ColumnType<number, number | undefined, never>;
  is_visible: ColumnType<number, number | undefined, never>;
  version: ColumnType<number, number | undefined, never>;
  compressed_size: number | null;
  checksum: string | null;
  deleted_at: string | null;
  updated_at: ColumnType<string, string | undefined, never>;
  created_at: ColumnType<string, string | undefined, never>;
}

/**
 * 사용자 정보 테이블
 */
export interface UsersTable {
  id: string;
  name: string;
  created_at: ColumnType<string, string | undefined, never>;
  last_active_at: ColumnType<string, string | undefined, never>;
}

/**
 * 명령 히스토리 테이블
 */
export interface CommandsTable {
  id: Generated<number>;
  user_id: string;
  user_name: string;
  message: string;
  created_at: ColumnType<string, string | undefined, never>;
}

/**
 * 전체 데이터베이스 스키마
 */
export interface Database {
  worships: WorshipsTable;
  songs: SongsTable;
  annotations: AnnotationsTable;
  users: UsersTable;
  commands: CommandsTable;
}

// 타입 추론용 (기존 코드 호환성)
export type Worship = Omit<WorshipsTable, 'id'> & { id: number };
export type NewWorship = Omit<WorshipsTable, 'id' | 'created_at'>;

export type Song = Omit<SongsTable, 'id'> & { id: number };
export type NewSong = Omit<SongsTable, 'id' | 'created_at'>;

export type Annotation = Omit<AnnotationsTable, 'id'> & { id: number };
export type NewAnnotation = Omit<AnnotationsTable, 'id' | 'created_at' | 'updated_at' | 'opacity' | 'is_visible' | 'version'>;

export type User = UsersTable;
export type NewUser = Omit<UsersTable, 'created_at' | 'last_active_at'>;

export type Command = Omit<CommandsTable, 'id'> & { id: number };
export type NewCommand = Omit<CommandsTable, 'id' | 'created_at'>;