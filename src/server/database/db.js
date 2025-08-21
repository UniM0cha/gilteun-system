import { readFileSync } from 'fs';
import { join } from 'path';
// Development fallback - use JSON database if better-sqlite3 is not available
let BetterSqlite3 = null;
let JsonDatabase = null;
export class DatabaseManager {
    constructor(_dbPath = 'gilteun-system.db') {
        this.isJsonDb = false;
        // Private constructor - use static async create method
    }
    static async create(dbPath = 'gilteun-system.db') {
        const instance = new DatabaseManager();
        // Try to load better-sqlite3
        try {
            const sqlite3Module = await import('better-sqlite3');
            BetterSqlite3 = sqlite3Module.default;
        }
        catch {
            console.warn('better-sqlite3 not available, using JSON database for development');
            try {
                const jsonDbModule = await import('./jsonDb');
                JsonDatabase = jsonDbModule.default;
            }
            catch (jsonError) {
                console.error('Failed to load JSON database:', jsonError);
            }
        }
        instance.isJsonDb = !BetterSqlite3;
        if (instance.isJsonDb && JsonDatabase) {
            instance.db = new JsonDatabase();
            console.log('JSON 데이터베이스 사용 중 (개발 모드)');
        }
        else if (BetterSqlite3) {
            instance.db = new BetterSqlite3(dbPath);
            instance.initialize();
        }
        else {
            throw new Error('No database engine available');
        }
        return instance;
    }
    initialize() {
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
            }
            catch (error) {
                console.error('Schema execution error:', error);
                console.error('Statement:', statement);
            }
        }
        console.log('데이터베이스 초기화 완료');
    }
    getDatabase() {
        return this.db;
    }
    close() {
        if (!this.isJsonDb && this.db.close) {
            this.db.close();
        }
    }
    // 트랜잭션 헬퍼
    transaction(fn) {
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
let dbInstance = null;
export const getDB = async () => {
    if (!dbInstance) {
        dbInstance = await DatabaseManager.create();
    }
    return dbInstance;
};
export const closeDB = () => {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
};
