import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import { app } from 'electron';
import * as schema from './schema';
import { logger } from '../utils/logger';

/**
 * SQLite 데이터베이스 연결 관리
 */
class DatabaseManager {
  private sqlite: Database.Database | null = null;
  private db: ReturnType<typeof drizzle> | null = null;

  /**
   * 데이터베이스 경로 결정
   */
  private getDatabasePath(): string {
    // 개발 환경에서는 프로젝트 루트에, 프로덕션에서는 userData 디렉토리에 저장
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'gilteun-system.db');
    } else {
      const userDataPath = app.getPath('userData');
      return path.join(userDataPath, 'gilteun-system.db');
    }
  }

  /**
   * 데이터베이스 연결 초기화
   */
  public async initialize(): Promise<void> {
    try {
      const dbPath = this.getDatabasePath();
      logger.info(`데이터베이스 연결 시도: ${dbPath}`);

      // SQLite 연결
      this.sqlite = new Database(dbPath);
      this.sqlite.pragma('journal_mode = WAL'); // 성능 향상을 위한 WAL 모드
      this.sqlite.pragma('foreign_keys = ON'); // 외래키 제약 조건 활성화

      // Drizzle ORM 초기화
      this.db = drizzle(this.sqlite, { schema });

      // 마이그레이션 실행
      await this.runMigrations();

      logger.info('데이터베이스 연결 성공');
    } catch (error) {
      logger.error('데이터베이스 연결 실패', error);
      throw error;
    }
  }

  /**
   * 마이그레이션 실행
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('데이터베이스가 초기화되지 않았습니다');
    }

    try {
      const migrationsFolder = path.join(__dirname, 'migrations');
      logger.info(`마이그레이션 실행: ${migrationsFolder}`);

      migrate(this.db, { migrationsFolder });
      logger.info('마이그레이션 완료');
    } catch (error) {
      logger.warn('마이그레이션 실행 중 오류 (초기 설정일 수 있음)', error);
      // 초기 테이블 생성
      await this.createInitialTables();
    }
  }

  /**
   * 초기 테이블 생성 (마이그레이션 파일이 없는 경우)
   */
  private async createInitialTables(): Promise<void> {
    if (!this.sqlite) return;

    logger.info('초기 테이블 생성 시작');

    // 테이블 생성 SQL
    const createTablesSQL = `
      -- 예배 테이블
      CREATE TABLE IF NOT EXISTS worships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- 찬양 테이블
      CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worship_id INTEGER REFERENCES worships(id),
        title TEXT NOT NULL,
        key TEXT,
        memo TEXT,
        image_path TEXT,
        "order" INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- 주석 테이블 (SVG 벡터 기반, 압축 지원)
      CREATE TABLE IF NOT EXISTS annotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER NOT NULL REFERENCES songs(id),
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        layer TEXT NOT NULL,
        svg_path TEXT NOT NULL,
        color TEXT NOT NULL,
        tool TEXT NOT NULL,
        stroke_width REAL DEFAULT 2,
        opacity REAL DEFAULT 1.0,
        is_visible INTEGER DEFAULT 1,
        version INTEGER DEFAULT 1,
        compressed_size INTEGER,
        checksum TEXT,
        deleted_at TEXT,
        updated_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- 사용자 테이블
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        last_active_at TEXT DEFAULT (datetime('now'))
      );

      -- 명령 히스토리 테이블
      CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- 주석 테이블 성능 최적화 인덱스들
      CREATE INDEX IF NOT EXISTS idx_annotations_song_user 
        ON annotations(song_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_annotations_song_active 
        ON annotations(song_id, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_annotations_user_active 
        ON annotations(user_id, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_annotations_created_at 
        ON annotations(created_at);
    `;

    try {
      this.sqlite.exec(createTablesSQL);
      logger.info('초기 테이블 생성 완료');
    } catch (error) {
      logger.error('초기 테이블 생성 실패', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 인스턴스 반환
   */
  public getDatabase(): ReturnType<typeof drizzle> {
    if (!this.db) {
      throw new Error('데이터베이스가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.');
    }
    return this.db;
  }

  /**
   * Raw SQLite 인스턴스 반환 (필요한 경우)
   */
  public getSQLite(): Database.Database {
    if (!this.sqlite) {
      throw new Error('SQLite가 초기화되지 않았습니다.');
    }
    return this.sqlite;
  }

  /**
   * 연결 종료
   */
  public close(): void {
    if (this.sqlite) {
      this.sqlite.close();
      this.sqlite = null;
      this.db = null;
      logger.info('데이터베이스 연결 종료');
    }
  }

  /**
   * 헬스 체크
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.sqlite) return false;

      // 간단한 쿼리로 연결 상태 확인
      const result = this.sqlite.prepare('SELECT 1 as test').get();
      return result !== null;
    } catch {
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const databaseManager = new DatabaseManager();

// 편의용 export
export const getDatabase = () => databaseManager.getDatabase();
export const getSQLite = () => databaseManager.getSQLite();
