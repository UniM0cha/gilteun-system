import { getDrizzleDB } from '../database/drizzle.js';
import { worships, worshipTypes, scores } from '../database/schema.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { Worship } from '@shared/types/worship';

export class WorshipService {
  private drizzleManager: Awaited<ReturnType<typeof getDrizzleDB>> | null = null;

  private async getDrizzle() {
    if (!this.drizzleManager) {
      this.drizzleManager = await getDrizzleDB();
    }
    return this.drizzleManager.getDatabase();
  }

  // 예배 목록 조회
  async getWorships(date?: string): Promise<Worship[]> {
    const db = await this.getDrizzle();

    let whereCondition = eq(worships.isActive, true);

    if (date) {
      whereCondition = and(eq(worships.isActive, true), eq(sql`DATE(${worships.date})`, date))!;
    }

    const worshipsWithTypes = await db
      .select({
        id: worships.id,
        name: worships.name,
        date: worships.date,
        isActive: worships.isActive,
        createdAt: worships.createdAt,
        updatedAt: worships.updatedAt,
        typeName: worshipTypes.name,
      })
      .from(worships)
      .innerJoin(worshipTypes, eq(worships.typeId, worshipTypes.id))
      .where(whereCondition)
      .orderBy(desc(worships.date), asc(worshipTypes.name));

    // 각 예배의 악보 ID 목록 조회
    const result: Worship[] = [];
    for (const row of worshipsWithTypes) {
      const scoreIds = await this.getScoreIdsByWorshipId(row.id);
      result.push({
        id: row.id,
        type: row.typeName,
        date: new Date(row.date),
        name: row.name,
        scoreIds,
        isActive: row.isActive,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });
    }

    return result;
  }

  // 특정 예배 조회
  async getWorshipById(id: string): Promise<Worship | null> {
    const db = await this.getDrizzle();

    const result = await db
      .select({
        id: worships.id,
        name: worships.name,
        date: worships.date,
        isActive: worships.isActive,
        createdAt: worships.createdAt,
        updatedAt: worships.updatedAt,
        typeName: worshipTypes.name,
      })
      .from(worships)
      .innerJoin(worshipTypes, eq(worships.typeId, worshipTypes.id))
      .where(eq(worships.id, id))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0]!;
    const scoreIds = await this.getScoreIdsByWorshipId(row.id);

    return {
      id: row.id,
      type: row.typeName,
      date: new Date(row.date),
      name: row.name,
      scoreIds,
      isActive: row.isActive,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  // 예배 생성
  async createWorship(data: { typeId: string; name: string; date: string }): Promise<string> {
    const id = `worship_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const db = await this.getDrizzle();

    await db.insert(worships).values({
      id,
      typeId: data.typeId,
      name: data.name,
      date: data.date,
    });

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
    const db = await this.getDrizzle();

    const updateData: Partial<typeof worships.$inferInsert> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.date !== undefined) {
      updateData.date = data.date;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    // 업데이트할 데이터가 없으면 false 반환
    if (Object.keys(updateData).length === 0) return false;

    // updatedAt은 자동으로 현재 시간으로 설정 (SQL 리터럴을 any로 캐스팅)
    (updateData as Record<string, unknown>).updatedAt = sql`CURRENT_TIMESTAMP`;

    const result = await db.update(worships).set(updateData).where(eq(worships.id, id));

    return result.changes > 0;
  }

  // 예배 삭제 (soft delete)
  async deleteWorship(id: string): Promise<boolean> {
    const db = await this.getDrizzle();

    const result = await db
      .update(worships)
      .set({
        isActive: false,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(worships.id, id));

    return result.changes > 0;
  }

  // 예배 유형 목록 조회
  async getWorshipTypes() {
    const db = await this.getDrizzle();

    return await db.select().from(worshipTypes).where(eq(worshipTypes.isActive, true)).orderBy(asc(worshipTypes.name));
  }

  // 예배에 속한 악보 ID 목록 조회
  private async getScoreIdsByWorshipId(worshipId: string): Promise<string[]> {
    const db = await this.getDrizzle();

    const result = await db
      .select({ id: scores.id })
      .from(scores)
      .where(eq(scores.worshipId, worshipId))
      .orderBy(asc(scores.orderIndex), asc(scores.createdAt));

    return result.map((row) => row.id);
  }
}
