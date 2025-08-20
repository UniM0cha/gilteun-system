import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string = 'gilton-system.db') {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
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
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

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

  getDatabase(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }

  // 트랜잭션 헬퍼
  transaction<T>(fn: (db: Database.Database) => T): T {
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