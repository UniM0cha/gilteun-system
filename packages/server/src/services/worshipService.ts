import { getDB } from '../database/db';
import type { Worship } from '@gilton/shared';

export class WorshipService {
  private db = getDB().getDatabase();

  // 예배 목록 조회
  getWorships(date?: string): Worship[] {
    let query = `
      SELECT w.*, wt.name as type_name
      FROM worships w
      JOIN worship_types wt ON w.type_id = wt.id
      WHERE w.is_active = 1
    `;
    
    const params: any[] = [];
    
    if (date) {
      query += ' AND DATE(w.date) = ?';
      params.push(date);
    }
    
    query += ' ORDER BY w.date DESC, wt.name';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(params) as any[];

    return rows.map(row => ({
      id: row.id,
      type: row.type_name,
      date: new Date(row.date),
      name: row.name,
      scoreIds: this.getScoreIdsByWorshipId(row.id),
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  // 특정 예배 조회
  getWorshipById(id: string): Worship | null {
    const stmt = this.db.prepare(`
      SELECT w.*, wt.name as type_name
      FROM worships w
      JOIN worship_types wt ON w.type_id = wt.id
      WHERE w.id = ?
    `);
    
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      type: row.type_name,
      date: new Date(row.date),
      name: row.name,
      scoreIds: this.getScoreIdsByWorshipId(row.id),
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // 예배 생성
  createWorship(data: {
    typeId: string;
    name: string;
    date: string;
  }): string {
    const id = `worship_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const stmt = this.db.prepare(`
      INSERT INTO worships (id, type_id, name, date)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, data.typeId, data.name, data.date);
    return id;
  }

  // 예배 수정
  updateWorship(id: string, data: {
    name?: string;
    date?: string;
    isActive?: boolean;
  }): boolean {
    const updates: string[] = [];
    const params: any[] = [];

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

    const stmt = this.db.prepare(`
      UPDATE worships 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(params);
    return result.changes > 0;
  }

  // 예배 삭제 (soft delete)
  deleteWorship(id: string): boolean {
    const stmt = this.db.prepare('UPDATE worships SET is_active = 0 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // 예배 유형 목록 조회
  getWorshipTypes() {
    const stmt = this.db.prepare(`
      SELECT * FROM worship_types 
      WHERE is_active = 1 
      ORDER BY name
    `);
    
    return stmt.all();
  }

  // 예배에 속한 악보 ID 목록 조회
  private getScoreIdsByWorshipId(worshipId: string): string[] {
    const stmt = this.db.prepare(`
      SELECT id FROM scores 
      WHERE worship_id = ? 
      ORDER BY order_index, created_at
    `);
    
    const rows = stmt.all(worshipId) as any[];
    return rows.map(row => row.id);
  }
}