// 데이터베이스 테이블 타입 정의

// 프로필 역할
export type ProfileRole = 'admin' | 'leader' | 'member';

// 주석 도구
export type AnnotationTool = 'pen' | 'highlighter' | 'eraser' | 'text' | 'shape';

// 프로필 테이블
export interface ProfileTable {
  id: string;
  name: string;
  role: ProfileRole;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// 예배 테이블
export interface WorshipTable {
  id: string;
  title: string;
  date: string;
  time: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// 찬양 테이블
export interface SongTable {
  id: string;
  worship_id: string;
  title: string;
  key: string | null;
  memo: string | null;
  image_path: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// 주석 테이블
export interface AnnotationTable {
  id: string;
  song_id: string;
  profile_id: string;
  svg_path: string;
  color: string;
  tool: AnnotationTool;
  stroke_width: number | null;
  metadata: string | null; // JSON 문자열
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// 명령 테이블
export interface CommandTable {
  id: string;
  worship_id: string;
  profile_id: string;
  message: string;
  created_at: string;
}

// Kysely 데이터베이스 스키마
export interface Database {
  profiles: ProfileTable;
  worships: WorshipTable;
  songs: SongTable;
  annotations: AnnotationTable;
  commands: CommandTable;
}
