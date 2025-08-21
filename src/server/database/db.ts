// Development fallback - use JSON database if better-sqlite3 is not available
let Database: any;
let JsonDatabase: any;

try {
  Database = require('better-sqlite3');
} catch {
  console.warn(
    'better-sqlite3 not available, using JSON database for development'
  );
  try {
    JsonDatabase = require('./jsonDb').default;
  } catch (jsonError) {
    console.error('Failed to load JSON database:', jsonError);
  }
}

import { readFileSync } from 'fs';
import { join } from 'path';

export class DatabaseManager {
  private db: any;
  private isJsonDb: boolean;

  constructor(dbPath: string = 'gilteun-system.db') {
    this.isJsonDb = !Database;

    if (this.isJsonDb) {
      this.db = new JsonDatabase();
      console.log('JSON 데이터베이스 사용 중 (개발 모드)');
    } else {
      this.db = new Database(dbPath);
      this.initialize();
    }
  }

  private initialize(): void {
    if (this.isJsonDb) {
      // JSON database doesn't need initialization
      return;
    }

    // WAL 모드 설정 (성능 향상)
    this.db.pragma('journal_mode = WAL');

    // 외래 키 제약 조건 활성화
    this.db.pragma('foreign_keys = ON');

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
        this.db.exec(statement);
      } catch (error) {
        console.error('Schema execution error:', error);
        console.error('Statement:', statement);
      }
    }

    console.log('데이터베이스 초기화 완료');
  }

  getDatabase(): any {
    return this.db;
  }

  close(): void {
    if (!this.isJsonDb && this.db.close) {
      this.db.close();
    }
  }

  // 트랜잭션 헬퍼
  transaction<T>(fn: (db: any) => T): T {
    if (this.isJsonDb) {
      // JSON database doesn't support transactions, execute directly
      return fn(this.db);
    }
    const transaction = this.db.transaction(fn);
    return transaction(this.db);
  }
}

// 싱글톤 인스턴스
let dbInstance: DatabaseManager | null = null;

export const getDB = (): DatabaseManager => {
  if (!dbInstance) {
    dbInstance = new DatabaseManager();
  }
  return dbInstance;
};

export const closeDB = (): void => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};
