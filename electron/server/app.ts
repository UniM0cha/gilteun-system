// Express 앱 설정

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { app as electronApp } from 'electron';
import { createApiRouter } from './routes/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp(): express.Application {
  const app = express();

  // 보안 미들웨어
  app.use(helmet({
    contentSecurityPolicy: false, // Electron 환경에서 비활성화
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // 이미지 로드 허용
  }));

  // CORS 설정
  app.use(cors({
    origin: true, // 모든 origin 허용 (로컬 환경)
    credentials: true,
  }));

  // JSON 파싱
  app.use(express.json({ limit: '10mb' })); // 주석 데이터 크기 고려

  // URL 인코딩
  app.use(express.urlencoded({ extended: true }));

  // 요청 로깅
  app.use(requestLogger);

  // 업로드 파일 정적 서빙 (CORS 헤더 포함)
  const userDataPath = electronApp?.getPath?.('userData') || process.cwd();
  const uploadsPath = path.join(userDataPath, 'uploads');
  app.use('/uploads', (_req, res, next) => {
    // 정적 파일에 대한 CORS 및 보안 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(uploadsPath));

  // API 라우터
  app.use('/api', createApiRouter());

  // 404 핸들러
  app.use(notFoundHandler);

  // 에러 핸들러
  app.use(errorHandler);

  return app;
}
