import { getDrizzleDB } from '../database/drizzle.js';
import { scores } from '../database/schema.js';
import { eq, and, max, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { Score } from '@shared/types/score';

export class ScoreService {
  private drizzleManager: Awaited<ReturnType<typeof getDrizzleDB>> | null = null;

  private async getDrizzle() {
    if (!this.drizzleManager) {
      this.drizzleManager = await getDrizzleDB();
    }
    return this.drizzleManager.getDatabase();
  }

  // 악보 목록 조회 (예배별)
  async getScoresByWorshipId(worshipId: string): Promise<Score[]> {
    const db = await this.getDrizzle();

    const result = await db
      .select()
      .from(scores)
      .where(eq(scores.worshipId, worshipId))
      .orderBy(asc(scores.orderIndex), asc(scores.createdAt));

    return result.map((row) => ({
      id: row.id,
      worshipId: row.worshipId,
      title: row.title,
      filePath: row.filePath,
      orderIndex: row.orderIndex,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  // 특정 악보 조회
  async getScoreById(id: string): Promise<Score | null> {
    const db = await this.getDrizzle();

    const result = await db.select().from(scores).where(eq(scores.id, id)).limit(1);

    if (result.length === 0) return null;

    const row = result[0]!;
    return {
      id: row.id,
      worshipId: row.worshipId,
      title: row.title,
      filePath: row.filePath,
      orderIndex: row.orderIndex,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
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
    const db = await this.getDrizzle();

    // orderIndex가 없으면 마지막 순서로 설정
    let orderIndex = data.orderIndex;
    if (orderIndex === undefined) {
      const result = await db
        .select({ maxOrder: max(scores.orderIndex) })
        .from(scores)
        .where(eq(scores.worshipId, data.worshipId));

      orderIndex = (result[0]?.maxOrder || 0) + 1;
    }

    await db.insert(scores).values({
      id,
      worshipId: data.worshipId,
      title: data.title,
      filePath: data.filePath,
      orderIndex,
    });

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
    const db = await this.getDrizzle();

    const updateData: Partial<typeof scores.$inferInsert> = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.orderIndex !== undefined) {
      updateData.orderIndex = data.orderIndex;
    }

    // 업데이트할 데이터가 없으면 false 반환
    if (Object.keys(updateData).length === 0) return false;

    // updatedAt은 자동으로 현재 시간으로 설정 (SQL 리터럴을 문자열로 변환)
    (updateData as Record<string, unknown>).updatedAt = sql`CURRENT_TIMESTAMP`;

    const result = await db.update(scores).set(updateData).where(eq(scores.id, id));

    return result.changes > 0;
  }

  // 악보 삭제
  async deleteScore(id: string): Promise<boolean> {
    const db = await this.getDrizzle();

    const result = await db.delete(scores).where(eq(scores.id, id));

    return result.changes > 0;
  }

  // 악보 순서 변경
  async reorderScores(worshipId: string, scoreOrders: { id: string; orderIndex: number }[]): Promise<boolean> {
    const drizzleManager = await getDrizzleDB();

    return await drizzleManager.transaction(async (tx) => {
      for (const { id, orderIndex } of scoreOrders) {
        await tx
          .update(scores)
          .set({
            orderIndex,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(and(eq(scores.id, id), eq(scores.worshipId, worshipId)));
      }
      return true;
    });
  }
}
