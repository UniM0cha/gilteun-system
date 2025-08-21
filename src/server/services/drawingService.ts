import { getDrizzleDB } from '../database/drizzle.js';
import { scoreDrawings } from '../database/schema.js';
import { eq, and, asc, sql } from 'drizzle-orm';
import type { DrawingEvent } from '@shared/types/score';

export class DrawingService {
  private drizzleManager: Awaited<ReturnType<typeof getDrizzleDB>> | null = null;

  private async getDrizzle() {
    if (!this.drizzleManager) {
      this.drizzleManager = await getDrizzleDB();
    }
    return this.drizzleManager.getDatabase();
  }

  // 드로잉 이벤트 저장
  async saveDrawing(drawing: DrawingEvent): Promise<string> {
    const id = `drawing_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const db = await this.getDrizzle();

    await db.insert(scoreDrawings).values({
      id,
      scoreId: drawing.scoreId,
      pageNumber: drawing.pageNumber,
      userId: drawing.userId,
      drawingType: drawing.tool,
      drawingData: JSON.stringify({
        points: drawing.points,
        settings: drawing.settings,
        isComplete: drawing.isComplete,
      }),
    });

    return id;
  }

  // 특정 악보 페이지의 모든 드로잉 조회
  async getDrawingsByScorePage(scoreId: string, pageNumber: number): Promise<DrawingEvent[]> {
    const db = await this.getDrizzle();

    const result = await db
      .select()
      .from(scoreDrawings)
      .where(and(eq(scoreDrawings.scoreId, scoreId), eq(scoreDrawings.pageNumber, pageNumber)))
      .orderBy(asc(scoreDrawings.createdAt));

    return result.map((row) => {
      const drawingData = JSON.parse(row.drawingData);
      return {
        id: row.id,
        scoreId: row.scoreId,
        pageNumber: row.pageNumber,
        userId: row.userId,
        tool: row.drawingType,
        points: drawingData.points,
        settings: drawingData.settings,
        isComplete: drawingData.isComplete,
        timestamp: new Date(row.createdAt),
      } as DrawingEvent;
    });
  }

  // 특정 악보의 모든 드로잉 조회
  async getDrawingsByScore(scoreId: string): Promise<DrawingEvent[]> {
    const db = await this.getDrizzle();

    const result = await db
      .select()
      .from(scoreDrawings)
      .where(eq(scoreDrawings.scoreId, scoreId))
      .orderBy(asc(scoreDrawings.pageNumber), asc(scoreDrawings.createdAt));

    return result.map((row) => {
      const drawingData = JSON.parse(row.drawingData);
      return {
        id: row.id,
        scoreId: row.scoreId,
        pageNumber: row.pageNumber,
        userId: row.userId,
        tool: row.drawingType,
        points: drawingData.points,
        settings: drawingData.settings,
        isComplete: drawingData.isComplete,
        timestamp: new Date(row.createdAt),
      } as DrawingEvent;
    });
  }

  // 드로잉 삭제 (특정 ID)
  async deleteDrawing(id: string): Promise<boolean> {
    const db = await this.getDrizzle();

    const result = await db.delete(scoreDrawings).where(eq(scoreDrawings.id, id));

    return result.changes > 0;
  }

  // 특정 악보 페이지의 모든 드로잉 삭제
  async clearDrawingsOnPage(scoreId: string, pageNumber: number): Promise<number> {
    const db = await this.getDrizzle();

    const result = await db
      .delete(scoreDrawings)
      .where(and(eq(scoreDrawings.scoreId, scoreId), eq(scoreDrawings.pageNumber, pageNumber)));

    return result.changes;
  }

  // 특정 악보의 모든 드로잉 삭제
  async clearDrawingsByScore(scoreId: string): Promise<number> {
    const db = await this.getDrizzle();

    const result = await db.delete(scoreDrawings).where(eq(scoreDrawings.scoreId, scoreId));

    return result.changes;
  }

  // 오래된 드로잉 정리 (예: 30일 이상 된 것들)
  async cleanupOldDrawings(daysOld: number = 30): Promise<number> {
    const db = await this.getDrizzle();

    const result = await db
      .delete(scoreDrawings)
      .where(sql`${scoreDrawings.createdAt} < datetime('now', '-' || ${daysOld} || ' days')`);

    return result.changes;
  }
}

export const drawingService = new DrawingService();
