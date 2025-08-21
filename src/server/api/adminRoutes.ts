import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { adminService } from '../services/adminService';
import { getDrizzleDB } from '../database/drizzle.js';
import { scores } from '../database/schema.js';
import { eq, sql } from 'drizzle-orm';
// Score 타입은 현재 사용하지 않지만 향후 확장을 위해 준비
// import type { Score } from '@shared/types/score';

const router = Router();

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'scores');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `score-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
});

// GET /api/admin/status - 시스템 상태 조회
router.get('/status', (_req, res) => {
  try {
    const status = adminService.getSystemStatus();
    const dbStats = adminService.getDatabaseStats();

    res.json({
      success: true,
      data: {
        ...status,
        databaseStats: dbStats,
      },
    });
  } catch (error) {
    adminService.addLog('error', '시스템 상태 조회 실패', 'AdminAPI', error);
    res.status(500).json({
      success: false,
      error: '시스템 상태를 조회할 수 없습니다.',
    });
  }
});

// GET /api/admin/users - 연결된 사용자 목록
router.get('/users', (_req, res) => {
  try {
    const users = adminService.getConnectedUsers();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    adminService.addLog('error', '사용자 목록 조회 실패', 'AdminAPI', error);
    res.status(500).json({
      success: false,
      error: '사용자 목록을 조회할 수 없습니다.',
    });
  }
});

// POST /api/admin/users/:socketId/disconnect - 사용자 강제 퇴장
router.post('/users/:socketId/disconnect', (req, res) => {
  try {
    const { socketId } = req.params;
    const { reason } = req.body;

    // Socket.IO를 통해 해당 사용자 연결 해제
    // 현재는 로그만 기록 (추후 Socket.IO 인스턴스 접근 시 구현)
    adminService.addLog('info', `관리자에 의한 사용자 강제 퇴장: ${socketId}`, 'AdminAPI', { reason });

    return res.json({
      success: true,
      message: '사용자 연결을 해제했습니다.',
    });
  } catch (error) {
    adminService.addLog('error', '사용자 강제 퇴장 실패', 'AdminAPI', error);
    return res.status(500).json({
      success: false,
      error: '사용자 연결 해제에 실패했습니다.',
    });
  }
});

// POST /api/admin/scores/upload - 악보 업로드
router.post('/scores/upload', upload.single('scoreFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '파일이 업로드되지 않았습니다.',
      });
    }

    const { title, worshipId } = req.body;

    if (!title || !worshipId) {
      return res.status(400).json({
        success: false,
        error: '제목과 예배 ID가 필요합니다.',
      });
    }

    const drizzleManager = await getDrizzleDB();
    const db = drizzleManager.getDatabase();
    const scoreId = adminService.generateScoreId();

    // 현재 예배의 악보 개수 조회하여 order_index 설정
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(scores)
      .where(eq(scores.worshipId, worshipId));

    const orderIndex = countResult[0]?.count || 0;

    // 악보 정보를 데이터베이스에 저장
    await db.insert(scores).values({
      id: scoreId,
      worshipId,
      title,
      filePath: `/uploads/scores/${req.file.filename}`,
      orderIndex,
    });

    adminService.addLog('info', `악보 업로드 완료: ${title}`, 'AdminAPI');

    return res.json({
      success: true,
      data: {
        id: scoreId,
        title,
        filePath: `/uploads/scores/${req.file.filename}`,
        worshipId,
      },
    });
  } catch (error) {
    adminService.addLog('error', '악보 업로드 실패', 'AdminAPI', error);
    return res.status(500).json({
      success: false,
      error: '악보 업로드에 실패했습니다.',
    });
  }
});

// DELETE /api/admin/scores/:id - 악보 삭제
router.delete('/scores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const drizzleManager = await getDrizzleDB();
    const db = drizzleManager.getDatabase();

    // 악보 정보 조회
    const scoreResult = await db.select().from(scores).where(eq(scores.id, id)).limit(1);

    const score = scoreResult[0];

    if (!score) {
      return res.status(404).json({
        success: false,
        error: '악보를 찾을 수 없습니다.',
      });
    }

    // 파일 삭제
    const filePath = path.join(process.cwd(), 'uploads', 'scores', path.basename(score.filePath));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 데이터베이스에서 삭제 (관련 드로잉도 CASCADE로 자동 삭제됨)
    await db.delete(scores).where(eq(scores.id, id));

    adminService.addLog('info', `악보 삭제 완료: ${score.title}`, 'AdminAPI');

    return res.json({
      success: true,
      message: '악보가 삭제되었습니다.',
    });
  } catch (error) {
    adminService.addLog('error', '악보 삭제 실패', 'AdminAPI', error);
    return res.status(500).json({
      success: false,
      error: '악보 삭제에 실패했습니다.',
    });
  }
});

// GET /api/admin/settings - 시스템 설정 조회
router.get('/settings', (_req, res) => {
  try {
    const settings = adminService.getSystemSettings();
    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    adminService.addLog('error', '시스템 설정 조회 실패', 'AdminAPI', error);
    return res.status(500).json({
      success: false,
      error: '시스템 설정을 조회할 수 없습니다.',
    });
  }
});

// PUT /api/admin/settings - 시스템 설정 업데이트
router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 설정 데이터입니다.',
      });
    }

    // 각 설정 항목을 개별적으로 업데이트
    const updatedKeys = [];
    for (const [key, value] of Object.entries(settings)) {
      if (await adminService.updateSystemSetting(key, value)) {
        updatedKeys.push(key);
      }
    }

    adminService.addLog('info', `시스템 설정 업데이트: ${updatedKeys.join(', ')}`, 'AdminAPI');

    return res.json({
      success: true,
      message: `${updatedKeys.length}개 설정이 업데이트되었습니다.`,
      updatedKeys,
    });
  } catch (error) {
    adminService.addLog('error', '시스템 설정 업데이트 실패', 'AdminAPI', error);
    return res.status(500).json({
      success: false,
      error: '시스템 설정 업데이트에 실패했습니다.',
    });
  }
});

// GET /api/admin/logs - 시스템 로그 조회
router.get('/logs', (_req, res) => {
  try {
    const { limit = 100, level } = _req.query;
    const logs = adminService.getLogs(
      parseInt(limit as string) || 100,
      level as 'info' | 'warn' | 'error' | 'debug' | undefined
    );

    return res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    adminService.addLog('error', '로그 조회 실패', 'AdminAPI', error);
    return res.status(500).json({
      success: false,
      error: '로그를 조회할 수 없습니다.',
    });
  }
});

// POST /api/admin/cleanup - 시스템 정리
router.post('/cleanup', async (_req, res) => {
  try {
    const result = await adminService.cleanupSystem();

    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    adminService.addLog('error', '시스템 정리 실패', 'AdminAPI', error);
    return res.status(500).json({
      success: false,
      error: '시스템 정리에 실패했습니다.',
    });
  }
});

export { router as adminRoutes };
