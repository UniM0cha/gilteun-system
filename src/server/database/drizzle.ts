import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

export class DrizzleManager {
  private db: ReturnType<typeof drizzle>;
  private sqlite: Database.Database;

  private constructor(dbPath: string = 'gilteun-system.db') {
    // Better-SQLite3 데이터베이스 연결
    this.sqlite = new Database(dbPath);

    // WAL 모드 설정 (성능 향상)
    this.sqlite.pragma('journal_mode = WAL');

    // 외래 키 제약 조건 활성화
    this.sqlite.pragma('foreign_keys = ON');

    // Drizzle 초기화
    this.db = drizzle(this.sqlite, { schema });

    console.log('Drizzle ORM 데이터베이스 초기화 완료');
  }

  static async create(dbPath: string = 'gilteun-system.db'): Promise<DrizzleManager> {
    const instance = new DrizzleManager(dbPath);

    try {
      // 마이그레이션 실행
      await instance.runMigrations();

      // 기본 데이터 삽입
      await instance.insertDefaultData();
    } catch (error) {
      console.error('데이터베이스 초기화 중 오류:', error);
      throw error;
    }

    return instance;
  }

  private async runMigrations(): Promise<void> {
    try {
      // 마이그레이션 실행 (drizzle 폴더에서 마이그레이션 파일 읽기)
      migrate(this.db, { migrationsFolder: './drizzle' });
      console.log('마이그레이션 완료');
    } catch (error) {
      console.warn('마이그레이션 실패 (첫 실행일 수 있음):', error);
      // 마이그레이션 실패 시 수동으로 테이블 생성
      await this.createTablesManually();
    }
  }

  private async createTablesManually(): Promise<void> {
    // 수동으로 테이블 생성 (마이그레이션 파일이 없을 때)
    const statements = [
      `CREATE TABLE IF NOT EXISTS instruments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS worship_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('session', 'leader', 'admin')),
        instrument_id TEXT NOT NULL,
        avatar TEXT,
        custom_commands TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instrument_id) REFERENCES instruments (id)
      )`,

      `CREATE TABLE IF NOT EXISTS worships (
        id TEXT PRIMARY KEY,
        type_id TEXT NOT NULL,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (type_id) REFERENCES worship_types (id)
      )`,

      `CREATE TABLE IF NOT EXISTS scores (
        id TEXT PRIMARY KEY,
        worship_id TEXT NOT NULL,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (worship_id) REFERENCES worships (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS score_drawings (
        id TEXT PRIMARY KEY,
        score_id TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        drawing_type TEXT NOT NULL,
        drawing_data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (score_id) REFERENCES scores (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      `CREATE TABLE IF NOT EXISTS commands (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        worship_id TEXT NOT NULL,
        content TEXT NOT NULL,
        target_type TEXT NOT NULL CHECK (target_type IN ('all', 'group', 'individual')),
        target_ids TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (sender_id) REFERENCES users (id),
        FOREIGN KEY (worship_id) REFERENCES worships (id)
      )`,
    ];

    for (const statement of statements) {
      try {
        this.sqlite.exec(statement);
      } catch (error) {
        console.error('테이블 생성 실패:', statement, error);
      }
    }

    console.log('수동 테이블 생성 완료');
  }

  private async insertDefaultData(): Promise<void> {
    try {
      // 기본 악기 데이터 삽입
      const instrumentsData = [
        { id: 'drum', name: '드럼', icon: '🥁', orderIndex: 1 },
        { id: 'bass', name: '베이스', icon: '🎸', orderIndex: 2 },
        { id: 'guitar', name: '기타', icon: '🎸', orderIndex: 3 },
        { id: 'keyboard', name: '키보드', icon: '🎹', orderIndex: 4 },
        { id: 'vocal', name: '보컬', icon: '🎤', orderIndex: 5 },
      ];

      // 중복 체크 후 삽입
      for (const instrument of instrumentsData) {
        const existing = await this.db
          .select()
          .from(schema.instruments)
          .where(eq(schema.instruments.id, instrument.id))
          .limit(1);

        if (existing.length === 0) {
          await this.db.insert(schema.instruments).values(instrument);
        }
      }

      // 기본 예배 유형 데이터 삽입
      const worshipTypesData = [
        { id: 'sunday_1st', name: '주일 1부예배' },
        { id: 'sunday_2nd', name: '주일 2부예배' },
        { id: 'sunday_3rd', name: '주일 3부예배' },
        { id: 'youth', name: '청년예배' },
        { id: 'wednesday', name: '수요예배' },
        { id: 'friday', name: '금요기도회' },
      ];

      for (const worshipType of worshipTypesData) {
        const existing = await this.db
          .select()
          .from(schema.worshipTypes)
          .where(eq(schema.worshipTypes.id, worshipType.id))
          .limit(1);

        if (existing.length === 0) {
          await this.db.insert(schema.worshipTypes).values(worshipType);
        }
      }

      console.log('기본 데이터 삽입 완료');
    } catch (error) {
      console.error('기본 데이터 삽입 실패:', error);
    }
  }

  getDatabase() {
    return this.db;
  }

  close(): void {
    this.sqlite.close();
  }

  // 트랜잭션 헬퍼
  async transaction<T>(fn: Parameters<typeof this.db.transaction>[0]): Promise<T> {
    return (await this.db.transaction(fn)) as T;
  }
}

// 싱글톤 인스턴스
let drizzleInstance: DrizzleManager | null = null;

export const getDrizzleDB = async (): Promise<DrizzleManager> => {
  if (!drizzleInstance) {
    drizzleInstance = await DrizzleManager.create();
  }
  return drizzleInstance;
};

export const closeDrizzleDB = (): void => {
  if (drizzleInstance) {
    drizzleInstance.close();
    drizzleInstance = null;
  }
};
