import { getDB } from '../database/db';
import type { Score } from '@shared/types/score';
import type { DatabaseInterface, ScoreRow, MaxOrderRow } from '../database/types';

export class ScoreService {
  private db: DatabaseInterface | null = null;

  private async getDatabase(): Promise<DatabaseInterface> {
    if (!this.db) {
      this.db = (await getDB()).getDatabase();
    }
    return this.db;
  }

  // 악보 목록 조회 (예배별)
  async getScoresByWorshipId(worshipId: string): Promise<Score[]> {
    const db = await this.getDatabase();
    const stmt = db.prepare?.(`
      SELECT * FROM scores 
      WHERE worship_id = ? 
      ORDER BY order_index, created_at
    `);

    const rows = (stmt?.all?.(worshipId) || []) as ScoreRow[];

    return rows.map((row) => ({
      id: String(row.id),
      worshipId: String(row.worship_id),
      title: String(row.title),
      filePath: String(row.file_path),
      orderIndex: Number(row.order_index),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    }));
  }

  // 특정 악보 조회
  async getScoreById(id: string): Promise<Score | null> {
    const db = await this.getDatabase();
    const stmt = db.prepare?.('SELECT * FROM scores WHERE id = ?');
    const row = stmt?.get?.(id) as ScoreRow | undefined;

    if (!row) return null;

    return {
      id: String(row.id),
      worshipId: String(row.worship_id),
      title: String(row.title),
      filePath: String(row.file_path),
      orderIndex: Number(row.order_index),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    };
  }

  // 악보 생성
  async createScore(data: {
    worshipId: string;
    title: string;
    filePath: string;
    orderIndex?: number;
  }): Promise<string> {
    const id = `score_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const db = await this.getDatabase();

    // orderIndex가 없으면 마지막 순서로 설정
    let orderIndex = data.orderIndex;
    if (orderIndex === undefined) {
      const maxOrderStmt = db.prepare?.(`
        SELECT MAX(order_index) as max_order 
        FROM scores 
        WHERE worship_id = ?
      `);
      const result = maxOrderStmt?.get?.(data.worshipId) as MaxOrderRow | undefined;
      orderIndex = (result?.max_order || 0) + 1;
    }

    const stmt = db.prepare?.(`
      INSERT INTO scores (id, worship_id, title, file_path, order_index)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt?.run(id, data.worshipId, data.title, data.filePath, orderIndex);
    return id;
  }

  // 악보 수정
  async updateScore(
    id: string,
    data: {
      title?: string;
      orderIndex?: number;
    }
  ): Promise<boolean> {
    const db = await this.getDatabase();
    const updates: string[] = [];
    const params: unknown[] = [];

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

    const stmt = db.prepare?.(`
      UPDATE scores 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    const validParams = params.filter((p): p is string | number | boolean | null => p !== undefined);
    const result = stmt?.run?.(...validParams) || { changes: 0 };
    return result.changes > 0;
  }

  // 악보 삭제
  async deleteScore(id: string): Promise<boolean> {
    const db = await this.getDatabase();
    const stmt = db.prepare?.('DELETE FROM scores WHERE id = ?');
    const result = stmt?.run?.(id) || { changes: 0 };
    return result.changes > 0;
  }

  // 악보 순서 변경
  async reorderScores(worshipId: string, scoreOrders: { id: string; orderIndex: number }[]): Promise<boolean> {
    const dbManager = await getDB();
    const db = dbManager.getDatabase();

    return dbManager.transaction(() => {
      for (const { id, orderIndex } of scoreOrders) {
        const stmt = db.prepare?.(`
          UPDATE scores 
          SET order_index = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND worship_id = ?
        `);
        stmt?.run?.(orderIndex, id, worshipId);
      }
      return true;
    });
  }
}
