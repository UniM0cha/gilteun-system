import { getDB } from '../database/db';
import type { DrawingEvent } from '@gilteun/shared';

export class DrawingService {
  private db = getDB().getDatabase();

  // 드로잉 이벤트 저장
  saveDrawing(drawing: DrawingEvent): string {
    const id = `drawing_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const stmt = this.db.prepare(`
      INSERT INTO score_drawings 
      (id, score_id, page_number, user_id, drawing_type, drawing_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      id,
      drawing.scoreId,
      drawing.pageNumber,
      drawing.userId,
      drawing.tool,
      JSON.stringify({
        points: drawing.points,
        settings: drawing.settings,
        isComplete: drawing.isComplete,
      })
    );

    return id;
  }

  // 특정 악보 페이지의 모든 드로잉 조회
  getDrawingsByScorePage(scoreId: string, pageNumber: number): DrawingEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM score_drawings 
      WHERE score_id = ? AND page_number = ?
      ORDER BY created_at ASC
    `);
    
    const rows = stmt.all(scoreId, pageNumber) as any[];
    
    return rows.map(row => {
      const drawingData = JSON.parse(row.drawing_data);
      return {
        id: row.id,
        scoreId: row.score_id,
        pageNumber: row.page_number,
        userId: row.user_id,
        tool: row.drawing_type,
        points: drawingData.points,
        settings: drawingData.settings,
        isComplete: drawingData.isComplete,
        timestamp: new Date(row.created_at),
      } as DrawingEvent;
    });
  }

  // 특정 악보의 모든 드로잉 조회
  getDrawingsByScore(scoreId: string): DrawingEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM score_drawings 
      WHERE score_id = ?
      ORDER BY page_number ASC, created_at ASC
    `);
    
    const rows = stmt.all(scoreId) as any[];
    
    return rows.map(row => {
      const drawingData = JSON.parse(row.drawing_data);
      return {
        id: row.id,
        scoreId: row.score_id,
        pageNumber: row.page_number,
        userId: row.user_id,
        tool: row.drawing_type,
        points: drawingData.points,
        settings: drawingData.settings,
        isComplete: drawingData.isComplete,
        timestamp: new Date(row.created_at),
      } as DrawingEvent;
    });
  }

  // 드로잉 삭제 (특정 ID)
  deleteDrawing(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM score_drawings WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // 특정 악보 페이지의 모든 드로잉 삭제
  clearDrawingsOnPage(scoreId: string, pageNumber: number): number {
    const stmt = this.db.prepare(`
      DELETE FROM score_drawings 
      WHERE score_id = ? AND page_number = ?
    `);
    const result = stmt.run(scoreId, pageNumber);
    return result.changes;
  }

  // 특정 악보의 모든 드로잉 삭제
  clearDrawingsByScore(scoreId: string): number {
    const stmt = this.db.prepare('DELETE FROM score_drawings WHERE score_id = ?');
    const result = stmt.run(scoreId);
    return result.changes;
  }

  // 오래된 드로잉 정리 (예: 30일 이상 된 것들)
  cleanupOldDrawings(daysOld: number = 30): number {
    const stmt = this.db.prepare(`
      DELETE FROM score_drawings 
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);
    const result = stmt.run(daysOld);
    return result.changes;
  }
}

export const drawingService = new DrawingService();