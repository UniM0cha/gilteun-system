import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { GilteunWebSocketHandler } from './websocket/handler';
import apiRoutes from './api/routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

/**
 * 길튼 시스템 Express 서버
 * iPad PWA 클라이언트와 WebSocket 통신을 위한 HTTP/WS 서버
 */
export class GilteunServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer | null = null;
  private wsHandler: GilteunWebSocketHandler | null = null;
  private port: number = 3000;

  constructor(port?: number) {
    if (port) this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Express 미들웨어 설정
   */
  private setupMiddleware(): void {
    // 보안 헤더
    this.app.use(
      helmet({
        contentSecurityPolicy: false, // PWA 호환성을 위해 비활성화
      }),
    );

    // CORS 설정 - iPad 클라이언트 연결 허용
    this.app.use(
      cors({
        origin:
          process.env.NODE_ENV === 'development'
            ? ['http://localhost:5173', 'http://192.168.*', 'http://10.0.*']
            : true, // 프로덕션에서는 로컬 네트워크만 허용
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      }),
    );

    // JSON 파싱
    this.app.use(express.json({ limit: '10mb' })); // 악보 이미지 업로드용
    this.app.use(express.urlencoded({ extended: true }));

    // 요청 로깅
    this.app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  /**
   * API 라우트 설정
   */
  private setupRoutes(): void {
    // 헬스 체크
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        server: '길튼 시스템 서버',
        version: '1.0.0',
      });
    });

    // API 라우트
    this.app.use('/api', apiRoutes);

    // 404 처리
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
      });
    });
  }

  /**
   * 에러 핸들링 설정
   */
  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * WebSocket 서버 설정
   */
  public setupWebSocket(): void {
    this.wss = new WebSocketServer({
      server: this.server,
      path: '/ws',
    });

    // 향상된 WebSocket 핸들러 초기화
    this.wsHandler = new GilteunWebSocketHandler(this.wss);

    logger.info(`WebSocket 서버가 ${this.port} 포트에서 실행중입니다`);
  }

  /**
   * 서버 시작
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`서버 시작 시도: 포트 ${this.port}`);

      this.server.listen(this.port, '0.0.0.0', () => {
        const address = this.server.address();
        logger.info('서버 바인딩 성공', { address, port: this.port });
        logger.info(`길튼 시스템 서버가 http://0.0.0.0:${this.port} 에서 실행중입니다`);

        this.setupWebSocket();
        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('서버 시작 실패', error);
        reject(error);
      });

      this.server.on('listening', () => {
        logger.info('서버 리스닝 이벤트 발생');
      });
    });
  }

  /**
   * 서버 종료
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          logger.info('WebSocket 서버가 종료되었습니다');
        });
      }

      this.server.close(() => {
        logger.info('HTTP 서버가 종료되었습니다');
        resolve();
      });
    });
  }

  /**
   * Express 앱 인스턴스 반환 (테스트용)
   */
  public getApp(): express.Application {
    return this.app;
  }

  /**
   * 현재 접속자 수 반환
   */
  public getConnectedClients(): number {
    return this.wsHandler?.getConnectedClientsCount() || 0;
  }

  /**
   * 서버 호스트 반환
   */
  public getHost(): string {
    return '0.0.0.0';
  }

  /**
   * 서버 포트 반환
   */
  public getPort(): number {
    return this.port;
  }
}
