import { Router } from 'express';
import { getDrizzleDB } from '../database/drizzle.js';
import * as schema from '../database/schema.js';
import { sql } from 'drizzle-orm';

const router = Router();

// GET /api/backup/export - 전체 데이터 백업
router.get('/export', async (_req, res) => {
  try {
    const drizzleManager = await getDrizzleDB();
    const db = drizzleManager.getDatabase();

    // 모든 테이블의 데이터 백업
    const [worshipTypes, worships, scores, users, instruments, drawingsCount] = await Promise.all([
      db.select().from(schema.worshipTypes),
      db.select().from(schema.worships),
      db.select().from(schema.scores),
      db.select().from(schema.users),
      db.select().from(schema.instruments),
      db.select({ count: sql<number>`COUNT(*)` }).from(schema.scoreDrawings),
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        worship_types: worshipTypes,
        worships: worships,
        scores: scores,
        users: users,
        instruments: instruments,
        // 드로잉 데이터는 크기가 클 수 있으므로 별도로 처리
        drawings_count: drawingsCount[0] || { count: 0 },
        // TODO: command_templates 테이블이 없으므로 빈 배열로 설정
        command_templates: [],
      },
    };

    return res.json({
      success: true,
      data: backup,
    });
  } catch (error) {
    console.error('데이터 백업 오류:', error);
    return res.status(500).json({
      success: false,
      error: '데이터 백업 중 오류가 발생했습니다.',
    });
  }
});

// POST /api/backup/import - 데이터 복원 (관리자용)
router.post('/import', async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !data.data) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 백업 데이터입니다.',
      });
    }

    const drizzleManager = await getDrizzleDB();
    const db = drizzleManager.getDatabase();

    // 트랜잭션으로 데이터 복원
    await drizzleManager.transaction(async () => {
      // 기존 데이터 삭제 (외래키 제약조건 고려한 순서)
      // CASCADE 설정으로 인해 연관 데이터가 자동 삭제됨
      await db.delete(schema.scoreDrawings);
      await db.delete(schema.scores);
      await db.delete(schema.worships);

      // 데이터 복원
      if (data.data.worship_types?.length) {
        await db.insert(schema.worshipTypes).values(
          data.data.worship_types.map(
            (item: { id: string; name: string; is_active: number; created_at: string; updated_at: string }) => ({
              id: item.id,
              name: item.name,
              isActive: Boolean(item.is_active),
              createdAt: item.created_at,
              updatedAt: item.updated_at,
            })
          )
        );
      }

      if (data.data.worships?.length) {
        await db.insert(schema.worships).values(
          data.data.worships.map(
            (item: {
              id: string;
              type_id: string;
              name: string;
              date: string;
              is_active: number;
              created_at: string;
              updated_at: string;
            }) => ({
              id: item.id,
              typeId: item.type_id,
              name: item.name,
              date: item.date,
              isActive: Boolean(item.is_active),
              createdAt: item.created_at,
              updatedAt: item.updated_at,
            })
          )
        );
      }

      if (data.data.scores?.length) {
        await db.insert(schema.scores).values(
          data.data.scores.map(
            (item: {
              id: string;
              worship_id: string;
              title: string;
              file_path: string;
              order_index: number;
              created_at: string;
              updated_at: string;
            }) => ({
              id: item.id,
              worshipId: item.worship_id,
              title: item.title,
              filePath: item.file_path,
              orderIndex: item.order_index,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
            })
          )
        );
      }

      // TODO: command_templates 테이블이 아직 없으므로 주석 처리
      // if (data.data.command_templates?.length) {
      //   await db.insert(schema.commandTemplates).values(
      //     data.data.command_templates.map((item: any) => ({...}))
      //   );
      // }
    });

    return res.json({
      success: true,
      message: '데이터 복원이 완료되었습니다.',
    });
  } catch (error) {
    console.error('데이터 복원 오류:', error);
    return res.status(500).json({
      success: false,
      error: '데이터 복원 중 오류가 발생했습니다.',
    });
  }
});

export { router as backupRoutes };

// TODO: command_templates 테이블 스키마 정의 완료 후 백업/복원 기능 완성 필요
