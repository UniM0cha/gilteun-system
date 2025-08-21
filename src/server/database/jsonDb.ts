import * as fs from 'fs';
import * as path from 'path';
import type { Worship } from '#shared/types/worship';
import type { User } from '#shared/types/user';
import type { Score, DrawingData } from '#shared/types/score';
import type { CommandTemplate } from '#shared/types/command';
import type { JsonDrawingData } from './types.js';

interface Database {
  worships: Worship[];
  users: User[];
  scores: Score[];
  score_drawings: DrawingData[];
  command_templates: CommandTemplate[];
}

// type DatabaseRecord = Worship | User | Score | DrawingData | CommandTemplate;

interface QueryResult {
  changes?: number;
  rows?: Record<string, string | number | boolean | null>[];
}

interface Statement {
  run: (...params: (string | number | boolean | null)[]) => { changes: number };
  get: (
    ...params: (string | number | boolean | null)[]
  ) => Record<string, string | number | boolean | null> | undefined;
  all: (...params: (string | number | boolean | null)[]) => Record<string, string | number | boolean | null>[];
}

class JsonDatabase {
  private dbPath: string;
  private data: Database = {
    worships: [],
    users: [],
    scores: [],
    score_drawings: [],
    command_templates: [],
  };

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'database.json');
    this.loadData();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        this.data = {
          worships: [],
          users: [],
          scores: [],
          score_drawings: [],
          command_templates: [],
        };
        this.saveData();
      }
    } catch (error) {
      console.error('데이터베이스 로드 오류:', error);
      this.data = {
        worships: [],
        users: [],
        scores: [],
        score_drawings: [],
        command_templates: [],
      };
    }
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('데이터베이스 저장 오류:', error);
    }
  }

  prepare(sql: string): Statement {
    // Simulate SQLite prepared statements with simple JSON operations
    return {
      run: (...params: (string | number | boolean | null)[]) => {
        const result = this.executeQuery(sql, params);
        return { changes: result.changes || 0 };
      },
      get: (...params: (string | number | boolean | null)[]) => {
        const result = this.executeQuery(sql, params);
        return result.rows && result.rows.length > 0 ? result.rows[0] : undefined;
      },
      all: (...params: (string | number | boolean | null)[]) => {
        const result = this.executeQuery(sql, params);
        return result.rows || [];
      },
    };
  }

  private executeQuery(sql: string, params: (string | number | boolean | null)[] = []): QueryResult {
    const sqlLower = sql.toLowerCase().trim();

    // INSERT operations
    if (sqlLower.startsWith('insert into')) {
      return this.handleInsert(sql, params);
    }

    // SELECT operations
    if (sqlLower.startsWith('select')) {
      return this.handleSelect(sql, params);
    }

    // DELETE operations
    if (sqlLower.startsWith('delete from')) {
      return this.handleDelete(sql, params);
    }

    // UPDATE operations
    if (sqlLower.startsWith('update')) {
      return this.handleUpdate(sql, params);
    }

    return { rows: [] };
  }

  private handleInsert(sql: string, params: (string | number | boolean | null)[]): { changes: number } {
    const tableName = this.extractTableName(sql);
    if (!tableName || !this.data[tableName as keyof Database]) {
      console.error('테이블을 찾을 수 없습니다:', tableName);
      return { changes: 0 };
    }

    // Simple insertion - create object with parameter values
    const newRecord: Record<string, string | number | boolean | null> = {};

    // For score_drawings table
    if (tableName === 'score_drawings' && params.length >= 6) {
      newRecord.id = params[0] ?? null;
      newRecord.score_id = params[1] ?? null;
      newRecord.page_number = params[2] ?? null;
      newRecord.user_id = params[3] ?? null;
      newRecord.drawing_type = params[4] ?? null;
      newRecord.drawing_data = params[5] ?? null;
      newRecord.created_at = new Date().toISOString();
    }

    (this.data[tableName as keyof Database] as unknown[]).push(newRecord);
    this.saveData();
    return { changes: 1 };
  }

  private handleSelect(
    sql: string,
    params: (string | number | boolean | null)[]
  ): { rows: Record<string, string | number | boolean | null>[] } {
    const tableName = this.extractTableName(sql);
    if (!tableName || !this.data[tableName as keyof Database]) {
      return { rows: [] };
    }

    const table = this.data[tableName as keyof Database];
    let filteredRows = [...table];

    // Basic WHERE filtering for score_drawings
    if (tableName === 'score_drawings') {
      if (sql.includes('WHERE score_id = ?') && params.length > 0) {
        filteredRows = filteredRows.filter((row) => (row as unknown as JsonDrawingData).score_id === params[0]);
      }
      if (sql.includes('WHERE score_id = ? AND page_number = ?') && params.length > 1) {
        filteredRows = filteredRows.filter(
          (row) =>
            (row as unknown as JsonDrawingData).score_id === params[0] &&
            (row as unknown as JsonDrawingData).page_number === params[1]
        );
      }
    }

    // Sort by created_at if specified
    if (sql.includes('ORDER BY created_at ASC') && tableName === 'score_drawings') {
      filteredRows.sort((a, b) => {
        const aCreatedAt = (a as unknown as JsonDrawingData).created_at;
        const bCreatedAt = (b as unknown as JsonDrawingData).created_at;
        const aDate = typeof aCreatedAt === 'string' ? aCreatedAt : '0';
        const bDate = typeof bCreatedAt === 'string' ? bCreatedAt : '0';
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });
    }

    return { rows: filteredRows as unknown as Record<string, string | number | boolean | null>[] };
  }

  private handleDelete(sql: string, params: (string | number | boolean | null)[]): { changes: number } {
    const tableName = this.extractTableName(sql);
    if (!tableName || !this.data[tableName as keyof Database]) {
      return { changes: 0 };
    }

    const table = this.data[tableName as keyof Database];
    const originalLength = table.length;

    // Basic WHERE filtering
    if (tableName === 'score_drawings') {
      if (sql.includes('WHERE id = ?') && params.length > 0) {
        (this.data[tableName as keyof Database] as unknown[]) = table.filter(
          (row) => (row as unknown as JsonDrawingData).id !== params[0]
        );
      } else if (sql.includes('WHERE score_id = ? AND page_number = ?') && params.length > 1) {
        (this.data[tableName as keyof Database] as unknown[]) = table.filter(
          (row) =>
            !(
              (row as unknown as JsonDrawingData).score_id === params[0] &&
              (row as unknown as JsonDrawingData).page_number === params[1]
            )
        );
      } else if (sql.includes('WHERE score_id = ?') && params.length > 0) {
        (this.data[tableName as keyof Database] as unknown[]) = table.filter(
          (row) => (row as unknown as JsonDrawingData).score_id !== params[0]
        );
      }
    }

    const changes = originalLength - this.data[tableName as keyof Database].length;
    if (changes > 0) {
      this.saveData();
    }

    return { changes };
  }

  private handleUpdate(_sql: string, _params: (string | number | boolean | null)[]): { changes: number } {
    // Basic update implementation can be added if needed
    return { changes: 0 };
  }

  private extractTableName(sql: string): string | null {
    const match = sql.match(/(?:from|into|update)\s+(\w+)/i);
    return match && match[1] ? match[1] : null;
  }
}

export default JsonDatabase;
