import { readFileSync } from 'fs';
import { join } from 'path';
import type Database from 'better-sqlite3';
import type { DatabaseInterface, JsonDatabaseInterface } from './types.js';

// Development fallback - use JSON database if better-sqlite3 is not available
let BetterSqlite3: typeof Database | null = null;
let JsonDatabase: (new (dbPath?: string) => JsonDatabaseInterface) | null = null;

export class DatabaseManager {
  private db!: DatabaseInterface; // 확정 할당 단언
  private isJsonDb: boolean = false;

  private constructor(_dbPath: string = 'gilteun-system.db') {
    // Private constructor - use static async create method
  }

  static async create(dbPath: string = 'gilteun-system.db'): Promise<DatabaseManager> {
    const instance = new DatabaseManager();

    // Try to load better-sqlite3
    try {
      const sqlite3Module = await import('better-sqlite3');
      BetterSqlite3 = sqlite3Module.default;
    } catch {
      console.warn('better-sqlite3 not available, using JSON database for development');
      try {
        const jsonDbModule = await import('./jsonDb');
        JsonDatabase = jsonDbModule.default;
      } catch (jsonError) {
        console.error('Failed to load JSON database:', jsonError);
      }
    }

    instance.isJsonDb = !BetterSqlite3;

    if (instance.isJsonDb && JsonDatabase) {
      instance.db = new JsonDatabase() as DatabaseInterface;
      console.log('JSON 데이터베이스 사용 중 (개발 모드)');
    } else if (BetterSqlite3) {
      instance.db = new BetterSqlite3(dbPath) as unknown as DatabaseInterface;
      instance.initialize();
    } else {
      throw new Error('No database engine available');
    }

    return instance;
  }

  private initialize(): void {
    if (this.isJsonDb) {
      // JSON database doesn't need initialization
      return;
    }

    // WAL 모드 설정 (성능 향상)
    this.db.pragma?.('journal_mode = WAL');

    // 외래 키 제약 조건 활성화
    this.db.pragma?.('foreign_keys = ON');

    // 스키마 파일 읽기 및 실행
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // 스키마를 여러 개의 문장으로 분리하여 실행
    const statements = schema
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      try {
        this.db.exec?.(statement);
      } catch (error) {
        console.error('Schema execution error:', error);
        console.error('Statement:', statement);
      }
    }

    console.log('데이터베이스 초기화 완료');
  }

  getDatabase(): DatabaseInterface {
    return this.db;
  }

  close(): void {
    if (!this.isJsonDb && this.db.close) {
      this.db.close();
    }
  }

  // 트랜잭션 헬퍼
  transaction<T>(fn: () => T): T {
    if (this.isJsonDb) {
      // JSON database doesn't support transactions, execute directly
      return fn();
    }
    if (this.db.transaction) {
      return this.db.transaction(fn);
    }
    return fn();
  }
}

// 싱글톤 인스턴스
let dbInstance: DatabaseManager | null = null;

export const getDB = async (): Promise<DatabaseManager> => {
  if (!dbInstance) {
    dbInstance = await DatabaseManager.create();
  }
  return dbInstance;
};

export const closeDB = (): void => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};
