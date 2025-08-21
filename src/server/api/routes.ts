import express, { Express, Request, Response, NextFunction } from 'express';
import { worshipRoutes } from './worshipRoutes';
import { scoreRoutes } from './scoreRoutes';
import { backupRoutes } from './backupRoutes';
import { adminRoutes } from './adminRoutes';
import { getDrizzleDB } from '../database/drizzle.js';

export async function setupRoutes(app: Express): Promise<void> {
  // 데이터베이스 초기화
  await getDrizzleDB();

  // 정적 파일 서빙 (업로드된 파일들)
  app.use('/uploads', express.static('uploads'));

  // API 라우트 연결
  app.use('/api/worships', worshipRoutes);
  app.use('/api/scores', scoreRoutes);
  app.use('/api/backup', backupRoutes);
  app.use('/api/admin', adminRoutes);

  // 악기 목록 API (개발용 하드코딩)
  app.get('/api/instruments', (_req, res) => {
    const instruments = [
      { id: 'drum', name: '드럼', icon: '🥁', order_index: 1, is_active: true },
      {
        id: 'bass',
        name: '베이스',
        icon: '🎸',
        order_index: 2,
        is_active: true,
      },
      {
        id: 'guitar',
        name: '기타',
        icon: '🎸',
        order_index: 3,
        is_active: true,
      },
      {
        id: 'keyboard',
        name: '키보드',
        icon: '🎹',
        order_index: 4,
        is_active: true,
      },
      {
        id: 'vocal',
        name: '보컬',
        icon: '🎤',
        order_index: 5,
        is_active: true,
      },
    ];
    res.json({ success: true, data: instruments });
  });

  // 예배 유형 목록 API (개발용 하드코딩)
  app.get('/api/worship-types', (_req, res) => {
    const types = [
      { id: 'sunday_1st', name: '주일 1부예배', is_active: true },
      { id: 'sunday_2nd', name: '주일 2부예배', is_active: true },
      { id: 'sunday_3rd', name: '주일 3부예배', is_active: true },
      { id: 'youth', name: '청년예배', is_active: true },
      { id: 'wednesday', name: '수요예배', is_active: true },
    ];
    res.json({ success: true, data: types });
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      message: '길튼 시스템 서버가 정상 작동 중입니다.',
      timestamp: new Date().toISOString(),
    });
  });

  // 에러 핸들링 미들웨어
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('API 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.',
    });
  });
}
