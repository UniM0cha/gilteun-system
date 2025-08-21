import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { SYSTEM_CONFIG } from '@gilteun/shared';
import { setupSocketHandlers } from './socket-handlers';
import { setupRoutes } from './routes';

export async function startApiServer(): Promise<void> {
  const app = express();
  const httpServer = createServer(app);
  
  // Socket.IO 서버 설정
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // 미들웨어 설정
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 정적 파일 제공 (악보 이미지 등)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // 프로덕션 환경에서 React 빌드 파일 서빙
  if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, '../../public');
    
    // React 빌드 파일 정적 서빙
    app.use(express.static(clientBuildPath));
  }

  // API 라우트 설정
  setupRoutes(app);

  // Socket.IO 이벤트 핸들러 설정
  setupSocketHandlers(io);

  // 기본 라우트
  app.get('/api/health', (_req, res) => {
    res.json({ 
      status: 'ok', 
      message: '길튼 시스템 서버가 정상 작동 중입니다.',
      timestamp: new Date().toISOString()
    });
  });

  // 프로덕션 환경에서 SPA를 위한 fallback (React Router 지원)
  if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && 
          !req.path.startsWith('/uploads') && 
          !req.path.startsWith('/socket.io')) {
        const clientBuildPath = path.join(__dirname, '../../public');
        res.sendFile(path.join(clientBuildPath, 'index.html'));
      }
    });
  }

  // 서버 시작
  const port = process.env.PORT || SYSTEM_CONFIG.DEFAULT_SERVER_PORT;
  
  return new Promise((resolve, reject) => {
    httpServer.listen(port, () => {
      console.log(`길튼 시스템 API 서버가 포트 ${port}에서 실행 중입니다.`);
      console.log(`클라이언트 접속 URL: http://localhost:${port}`);
      resolve();
    }).on('error', (error) => {
      console.error('서버 시작 실패:', error);
      reject(error);
    });
  });
}