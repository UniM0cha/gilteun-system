import { Router } from 'express';
import worshipsRouter from './worships';
import songsRouter from './songs';
import annotationsRouter from './annotations';
import usersRouter from './users';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 길튼 시스템 API 라우터
 * Phase 1에서는 기본 구조만 설정하고, Phase 2에서 데이터베이스 연동 구현
 */

// API 정보
router.get('/', (_req, res) => {
  res.json({
    name: '길튼 시스템 API',
    version: '1.0.0',
    description: '교회 찬양팀 실시간 협업 플랫폼 API',
    endpoints: {
      worships: '/api/worships',
      songs: '/api/songs',
      annotations: '/api/annotations',
      users: '/api/users',
    },
    documentation: 'https://github.com/your-org/gilteun-system/wiki/api',
  });
});

// 서버 상태 정보
router.get('/status', (_req, res) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
    },
    platform: process.platform,
    nodeVersion: process.version,
  });
});

// 각 도메인별 라우터 연결
router.use('/worships', worshipsRouter);
router.use('/songs', songsRouter);
router.use('/annotations', annotationsRouter);
router.use('/users', usersRouter);

// 404 처리
router.use((req, res) => {
  logger.warn(`API 엔드포인트를 찾을 수 없습니다: ${req.originalUrl}`);
  res.status(404).json({
    error: 'Endpoint Not Found',
    message: `API 엔드포인트 ${req.originalUrl}를 찾을 수 없습니다`,
    availableEndpoints: [
      'GET /api/',
      'GET /api/status',
      'GET /api/worships',
      'GET /api/songs',
      'GET /api/annotations',
      'GET /api/users',
    ],
  });
});

export default router;
