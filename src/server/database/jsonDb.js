import * as fs from 'fs';
import * as path from 'path';
class JsonDatabase {
    constructor(dbPath) {
        this.data = {
            worships: [],
            users: [],
            scores: [],
            score_drawings: [],
            command_templates: [],
        };
        this.dbPath = dbPath || path.join(process.cwd(), 'database.json');
        this.loadData();
    }
    loadData() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const fileContent = fs.readFileSync(this.dbPath, 'utf-8');
                this.data = JSON.parse(fileContent);
            }
            else {
                this.data = {
                    worships: [],
                    users: [],
                    scores: [],
                    score_drawings: [],
                    command_templates: [],
                };
                this.saveData();
            }
        }
        catch (error) {
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
    saveData() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
        }
        catch (error) {
            console.error('데이터베이스 저장 오류:', error);
        }
    }
    prepare(sql) {
        // Simulate SQLite prepared statements with simple JSON operations
        return {
            run: (...params) => {
                const result = this.executeQuery(sql, params);
                return { changes: result.changes || 0 };
            },
            get: (...params) => {
                const result = this.executeQuery(sql, params);
                return result.rows && result.rows.length > 0 ? result.rows[0] : undefined;
            },
            all: (...params) => {
                const result = this.executeQuery(sql, params);
                return result.rows || [];
            },
        };
    }
    executeQuery(sql, params = []) {
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
    handleInsert(sql, params) {
        const tableName = this.extractTableName(sql);
        if (!tableName || !this.data[tableName]) {
            console.error('테이블을 찾을 수 없습니다:', tableName);
            return { changes: 0 };
        }
        // Simple insertion - create object with parameter values
        const newRecord = {};
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
        this.data[tableName].push(newRecord);
        this.saveData();
        return { changes: 1 };
    }
    handleSelect(sql, params) {
        const tableName = this.extractTableName(sql);
        if (!tableName || !this.data[tableName]) {
            return { rows: [] };
        }
        const table = this.data[tableName];
        let filteredRows = [...table];
        // Basic WHERE filtering for score_drawings
        if (tableName === 'score_drawings') {
            if (sql.includes('WHERE score_id = ?') && params.length > 0) {
                filteredRows = filteredRows.filter((row) => row.score_id === params[0]);
            }
            if (sql.includes('WHERE score_id = ? AND page_number = ?') && params.length > 1) {
                filteredRows = filteredRows.filter((row) => row.score_id === params[0] &&
                    row.page_number === params[1]);
            }
        }
        // Sort by created_at if specified
        if (sql.includes('ORDER BY created_at ASC') && tableName === 'score_drawings') {
            filteredRows.sort((a, b) => {
                const aCreatedAt = a.created_at;
                const bCreatedAt = b.created_at;
                const aDate = typeof aCreatedAt === 'string' ? aCreatedAt : '0';
                const bDate = typeof bCreatedAt === 'string' ? bCreatedAt : '0';
                return new Date(aDate).getTime() - new Date(bDate).getTime();
            });
        }
        return { rows: filteredRows };
    }
    handleDelete(sql, params) {
        const tableName = this.extractTableName(sql);
        if (!tableName || !this.data[tableName]) {
            return { changes: 0 };
        }
        const table = this.data[tableName];
        const originalLength = table.length;
        // Basic WHERE filtering
        if (tableName === 'score_drawings') {
            if (sql.includes('WHERE id = ?') && params.length > 0) {
                this.data[tableName] = table.filter((row) => row.id !== params[0]);
            }
            else if (sql.includes('WHERE score_id = ? AND page_number = ?') && params.length > 1) {
                this.data[tableName] = table.filter((row) => !(row.score_id === params[0] &&
                    row.page_number === params[1]));
            }
            else if (sql.includes('WHERE score_id = ?') && params.length > 0) {
                this.data[tableName] = table.filter((row) => row.score_id !== params[0]);
            }
        }
        const changes = originalLength - this.data[tableName].length;
        if (changes > 0) {
            this.saveData();
        }
        return { changes };
    }
    handleUpdate(_sql, _params) {
        // Basic update implementation can be added if needed
        return { changes: 0 };
    }
    extractTableName(sql) {
        const match = sql.match(/(?:from|into|update)\s+(\w+)/i);
        return match && match[1] ? match[1] : null;
    }
}
export default JsonDatabase;
