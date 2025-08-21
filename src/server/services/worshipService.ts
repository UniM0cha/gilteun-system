import { getDB } from '../database/db.js';
import type { Worship } from '#shared/types/worship';
import type { DatabaseInterface, WorshipRow, ScoreIdRow } from '../database/types.js';

export class WorshipService {
  private db: DatabaseInterface | null = null;

  private async getDatabase(): Promise<DatabaseInterface> {
    if (!this.db) {
      this.db = (await getDB()).getDatabase() as DatabaseInterface;
    }
    return this.db;
  }

  // 예배 목록 조회
  async getWorships(date?: string): Promise<Worship[]> {
    let query = `
      SELECT w.*, wt.name as type_name
      FROM worships w
      JOIN worship_types wt ON w.type_id = wt.id
      WHERE w.is_active = 1
    `;

    const params: unknown[] = [];

    if (date) {
      query += ' AND DATE(w.date) = ?';
      params.push(date);
    }

    query += ' ORDER BY w.date DESC, wt.name';

    const db = await this.getDatabase();
    const stmt = db.prepare?.(query);
    const validParams = params.filter((p): p is string | number | boolean | null => p !== undefined);
    const rows = (stmt?.all?.(...validParams) || []) as WorshipRow[];

    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        type: row.type_name,
        date: new Date(row.date),
        name: row.name,
        scoreIds: await this.getScoreIdsByWorshipId(row.id),
        isActive: Boolean(row.is_active),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }))
    );
  }

  // 특정 예배 조회
  async getWorshipById(id: string): Promise<Worship | null> {
    const db = await this.getDatabase();
    const stmt = db.prepare?.(`
      SELECT w.*, wt.name as type_name
      FROM worships w
      JOIN worship_types wt ON w.type_id = wt.id
      WHERE w.id = ?
    `);

    const row = stmt?.get?.(id) as WorshipRow | undefined;
    if (!row) return null;

    return {
      id: String(row.id),
      type: String(row.type_name),
      date: new Date(String(row.date)),
      name: String(row.name),
      scoreIds: await this.getScoreIdsByWorshipId(String(row.id)),
      isActive: Boolean(row.is_active),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    };
  }

  // 예배 생성
  async createWorship(data: { typeId: string; name: string; date: string }): Promise<string> {
    const id = `worship_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const db = await this.getDatabase();

    const stmt = db.prepare?.(`
      INSERT INTO worships (id, type_id, name, date)
      VALUES (?, ?, ?, ?)
    `);

    stmt?.run?.(id, data.typeId, data.name, data.date);
    return id;
  }

  // 예배 수정
  async updateWorship(
    id: string,
    data: {
      name?: string;
      date?: string;
      isActive?: boolean;
    }
  ): Promise<boolean> {
    const db = await this.getDatabase();
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }

    if (data.date !== undefined) {
      updates.push('date = ?');
      params.push(data.date);
    }

    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) return false;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = db.prepare?.(`
      UPDATE worships 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    const validParams = params.filter((p): p is string | number | boolean | null => p !== undefined);
    const result = stmt?.run?.(...validParams) || { changes: 0 };
    return result.changes > 0;
  }

  // 예배 삭제 (soft delete)
  async deleteWorship(id: string): Promise<boolean> {
    const db = await this.getDatabase();
    const stmt = db.prepare?.('UPDATE worships SET is_active = 0 WHERE id = ?');
    const result = stmt?.run?.(id) || { changes: 0 };
    return result.changes > 0;
  }

  // 예배 유형 목록 조회
  async getWorshipTypes() {
    const db = await this.getDatabase();
    const stmt = db.prepare?.(`
      SELECT * FROM worship_types 
      WHERE is_active = 1 
      ORDER BY name
    `);

    return stmt?.all?.() || [];
  }

  // 예배에 속한 악보 ID 목록 조회
  private async getScoreIdsByWorshipId(worshipId: string): Promise<string[]> {
    const db = await this.getDatabase();
    const stmt = db.prepare?.(`
      SELECT id FROM scores 
      WHERE worship_id = ? 
      ORDER BY order_index, created_at
    `);

    const rows = (stmt?.all?.(worshipId) || []) as ScoreIdRow[];
    return rows.map((row) => String(row.id));
  }
}
