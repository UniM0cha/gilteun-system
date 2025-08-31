// Kysely로 마이그레이션 후 타입만 재export
export type { 
  Worship, 
  NewWorship,
  Song,
  NewSong,
  Annotation,
  NewAnnotation,
  User,
  NewUser,
  Command,
  NewCommand,
  Database,
  WorshipsTable,
  SongsTable,
  AnnotationsTable,
  UsersTable,
  CommandsTable
} from './types';

// 기존 코드 호환성을 위한 테이블 이름 상수
export const worships = 'worships' as const;
export const songs = 'songs' as const;
export const annotations = 'annotations' as const;
export const users = 'users' as const;
export const commands = 'commands' as const;