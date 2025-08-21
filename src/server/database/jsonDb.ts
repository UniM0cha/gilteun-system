import * as fs from 'fs';
import * as path from 'path';

interface Database {
  worships: any[];
  users: any[];
  scores: any[];
  score_drawings: any[];
  command_templates: any[];
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

  prepare(sql: string) {
    // Simulate SQLite prepared statements with simple JSON operations
    return {
      run: (...params: any[]) => {
        const result = this.executeQuery(sql, params);
        return { changes: result.changes || 0 };
      },
      get: (...params: any[]) => {
        const result = this.executeQuery(sql, params);
        return result.rows && result.rows.length > 0 ? result.rows[0] : undefined;
      },
      all: (...params: any[]) => {
        const result = this.executeQuery(sql, params);
        return result.rows || [];
      },
    };
  }

  private executeQuery(sql: string, params: any[] = []): { changes?: number; rows?: any[] } {
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

  private handleInsert(sql: string, params: any[]): { changes: number } {
    const tableName = this.extractTableName(sql);
    if (!tableName || !this.data[tableName as keyof Database]) {
      console.error('테이블을 찾을 수 없습니다:', tableName);
      return { changes: 0 };
    }

    // Simple insertion - create object with parameter values
    const newRecord: any = {};

    // For score_drawings table
    if (tableName === 'score_drawings' && params.length >= 6) {
      newRecord.id = params[0];
      newRecord.score_id = params[1];
      newRecord.page_number = params[2];
      newRecord.user_id = params[3];
      newRecord.drawing_type = params[4];
      newRecord.drawing_data = params[5];
      newRecord.created_at = new Date().toISOString();
    }

    this.data[tableName as keyof Database].push(newRecord);
    this.saveData();
    return { changes: 1 };
  }

  private handleSelect(sql: string, params: any[]): { rows: any[] } {
    const tableName = this.extractTableName(sql);
    if (!tableName || !this.data[tableName as keyof Database]) {
      return { rows: [] };
    }

    const table = this.data[tableName as keyof Database];
    let filteredRows = [...table];

    // Basic WHERE filtering for score_drawings
    if (tableName === 'score_drawings') {
      if (sql.includes('WHERE score_id = ?') && params.length > 0) {
        filteredRows = filteredRows.filter((row) => row.score_id === params[0]);
      }
      if (sql.includes('WHERE score_id = ? AND page_number = ?') && params.length > 1) {
        filteredRows = filteredRows.filter((row) => row.score_id === params[0] && row.page_number === params[1]);
      }
    }

    // Sort by created_at if specified
    if (sql.includes('ORDER BY created_at ASC')) {
      filteredRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return { rows: filteredRows };
  }

  private handleDelete(sql: string, params: any[]): { changes: number } {
    const tableName = this.extractTableName(sql);
    if (!tableName || !this.data[tableName as keyof Database]) {
      return { changes: 0 };
    }

    const table = this.data[tableName as keyof Database];
    const originalLength = table.length;

    // Basic WHERE filtering
    if (tableName === 'score_drawings') {
      if (sql.includes('WHERE id = ?') && params.length > 0) {
        this.data[tableName as keyof Database] = table.filter((row) => row.id !== params[0]);
      } else if (sql.includes('WHERE score_id = ? AND page_number = ?') && params.length > 1) {
        this.data[tableName as keyof Database] = table.filter(
          (row) => !(row.score_id === params[0] && row.page_number === params[1])
        );
      } else if (sql.includes('WHERE score_id = ?') && params.length > 0) {
        this.data[tableName as keyof Database] = table.filter((row) => row.score_id !== params[0]);
      }
    }

    const changes = originalLength - this.data[tableName as keyof Database].length;
    if (changes > 0) {
      this.saveData();
    }

    return { changes };
  }

  private handleUpdate(_sql: string, _params: any[]): { changes: number } {
    // Basic update implementation can be added if needed
    return { changes: 0 };
  }

  private extractTableName(sql: string): string | null {
    const match = sql.match(/(?:from|into|update)\s+(\w+)/i);
    return match && match[1] ? match[1] : null;
  }
}

export default JsonDatabase;
