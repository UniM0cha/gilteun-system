import { Router } from 'express';
import { getDB } from '../database/db.js';
const router = Router();
// GET /api/backup/export - 전체 데이터 백업
router.get('/export', async (_req, res) => {
    try {
        const db = (await getDB()).getDatabase();
        // 모든 테이블의 데이터 백업
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {
                worship_types: db.prepare?.('SELECT * FROM worship_types')?.all() || [],
                worships: db.prepare?.('SELECT * FROM worships')?.all() || [],
                scores: db.prepare?.('SELECT * FROM scores')?.all() || [],
                users: db.prepare?.('SELECT * FROM users')?.all() || [],
                instruments: db.prepare?.('SELECT * FROM instruments')?.all() || [],
                // 드로잉 데이터는 크기가 클 수 있으므로 별도로 처리
                drawings_count: db.prepare?.('SELECT COUNT(*) as count FROM score_drawings')?.get() || { count: 0 },
                command_templates: db.prepare?.('SELECT * FROM command_templates')?.all() || [],
            },
        };
        return res.json({
            success: true,
            data: backup,
        });
    }
    catch (error) {
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
        const db = (await getDB()).getDatabase();
        // 트랜잭션으로 데이터 복원
        const runTransaction = db.transaction || ((fn) => fn());
        runTransaction(() => {
            // 기존 데이터 삭제 (외래키 제약조건 고려한 순서)
            db.exec?.('DELETE FROM score_drawings');
            db.exec?.('DELETE FROM command_templates');
            db.exec?.('DELETE FROM scores');
            db.exec?.('DELETE FROM worships');
            // 데이터 복원
            if (data.data.worship_types) {
                const insertWorshipType = db.prepare?.(`
          INSERT INTO worship_types (id, name, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `);
                for (const item of data.data.worship_types) {
                    insertWorshipType?.run(item.id, item.name, item.is_active, item.created_at, item.updated_at);
                }
            }
            if (data.data.worships) {
                const insertWorship = db.prepare?.(`
          INSERT INTO worships (id, type_id, name, date, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
                for (const item of data.data.worships) {
                    insertWorship?.run(item.id, item.type_id, item.name, item.date, item.is_active, item.created_at, item.updated_at);
                }
            }
            if (data.data.scores) {
                const insertScore = db.prepare?.(`
          INSERT INTO scores (id, worship_id, title, file_path, order_index, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
                for (const item of data.data.scores) {
                    insertScore?.run(item.id, item.worship_id, item.title, item.file_path, item.order_index, item.created_at, item.updated_at);
                }
            }
            if (data.data.command_templates) {
                const insertTemplate = db.prepare?.(`
          INSERT INTO command_templates (id, title, content, order_index, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
                for (const item of data.data.command_templates) {
                    insertTemplate?.run(item.id, item.title, item.content, item.order_index, item.created_at, item.updated_at);
                }
            }
        });
        return res.json({
            success: true,
            message: '데이터 복원이 완료되었습니다.',
        });
    }
    catch (error) {
        console.error('데이터 복원 오류:', error);
        return res.status(500).json({
            success: false,
            error: '데이터 복원 중 오류가 발생했습니다.',
        });
    }
});
export { router as backupRoutes };
