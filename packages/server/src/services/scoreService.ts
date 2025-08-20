import { getDB } from '../database/db';
import type { Score } from '@gilton/shared';

export class ScoreService {
  private db = getDB().getDatabase();

  // 악보 목록 조회 (예배별)
  getScoresByWorshipId(worshipId: string): Score[] {
    const stmt = this.db.prepare(`
      SELECT * FROM scores 
      WHERE worship_id = ? 
      ORDER BY order_index, created_at
    `);
    
    const rows = stmt.all(worshipId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      worshipId: row.worship_id,
      title: row.title,
      filePath: row.file_path,
      orderIndex: row.order_index,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  // 특정 악보 조회
  getScoreById(id: string): Score | null {
    const stmt = this.db.prepare('SELECT * FROM scores WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      worshipId: row.worship_id,
      title: row.title,
      filePath: row.file_path,
      orderIndex: row.order_index,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // 악보 생성
  createScore(data: {
    worshipId: string;
    title: string;
    filePath: string;
    orderIndex?: number;
  }): string {
    const id = `score_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // orderIndex가 없으면 마지막 순서로 설정
    let orderIndex = data.orderIndex;
    if (orderIndex === undefined) {
      const maxOrderStmt = this.db.prepare(`
        SELECT MAX(order_index) as max_order 
        FROM scores 
        WHERE worship_id = ?
      `);
      const result = maxOrderStmt.get(data.worshipId) as any;
      orderIndex = (result?.max_order || 0) + 1;
    }
    
    const stmt = this.db.prepare(`
      INSERT INTO scores (id, worship_id, title, file_path, order_index)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, data.worshipId, data.title, data.filePath, orderIndex);
    return id;
  }

  // 악보 수정
  updateScore(id: string, data: {
    title?: string;
    orderIndex?: number;
  }): boolean {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }

    if (data.orderIndex !== undefined) {
      updates.push('order_index = ?');
      params.push(data.orderIndex);
    }

    if (updates.length === 0) return false;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE scores 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(params);
    return result.changes > 0;
  }

  // 악보 삭제
  deleteScore(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM scores WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // 악보 순서 변경
  reorderScores(worshipId: string, scoreOrders: { id: string; orderIndex: number }[]): boolean {
    return getDB().transaction(() => {
      for (const { id, orderIndex } of scoreOrders) {
        const stmt = this.db.prepare(`
          UPDATE scores 
          SET order_index = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND worship_id = ?
        `);
        stmt.run(orderIndex, id, worshipId);
      }
      return true;
    });
  }
}