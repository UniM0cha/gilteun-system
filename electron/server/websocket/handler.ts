import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { getDatabase } from '../database/connection';
import { annotations, commands, users } from '../database/schema';
import { desc, eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import type {
  AnnotationCompleteMessage,
  ClientInfo,
  CommandSendMessage,
  SyncRequestMessage,
  WebSocketMessage,
} from './types';

/**
 * 길튼 시스템 WebSocket 핸들러
 * 실시간 주석 동기화, 명령 전송, 사용자 상태 관리
 */
export class GilteunWebSocketHandler {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientInfo>();
  private readonly MAX_CLIENTS = 30; // 최대 30명 동시 접속

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupEventHandlers();
  }

  /**
   * WebSocket 서버 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    this.wss.on('connection', this.handleConnection.bind(this));

    // 주기적인 하트비트 체크 (30초마다)
    setInterval(() => {
      this.heartbeatCheck();
    }, 30000);

    // 비활성 클라이언트 정리 (5분마다)
    setInterval(() => {
      this.cleanupInactiveClients();
    }, 300000);
  }

  /**
   * 새 클라이언트 연결 처리
   */
  private async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    const clientIp = request.socket.remoteAddress;
    const url = new URL(request.url || '', 'ws://localhost');
    const userId = url.searchParams.get('userId') || `user-${Date.now()}`;
    const userName = url.searchParams.get('userName') || '익명 사용자';

    logger.info('WebSocket 클라이언트 연결', {
      userId,
      userName,
      ip: clientIp,
    });

    // 접속자 수 제한 확인
    if (this.clients.size >= this.MAX_CLIENTS) {
      logger.warn('최대 접속자 수 초과', { currentClients: this.clients.size });
      ws.send(
        JSON.stringify({
          type: 'error',
          code: 'MAX_CLIENTS_EXCEEDED',
          message: '최대 접속자 수(30명)를 초과했습니다',
          timestamp: Date.now(),
        }),
      );
      ws.close();
      return;
    }

    // 클라이언트 정보 저장
    const clientInfo: ClientInfo = {
      userId,
      userName,
      connectedAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    this.clients.set(ws, clientInfo);

    // 데이터베이스에 사용자 정보 저장/업데이트
    await this.updateUserInDatabase(userId, userName);

    // 환영 메시지 전송
    await this.sendWelcomeMessage(ws);

    // 다른 클라이언트들에게 새 사용자 접속 알림
    await this.broadcastUserConnect(clientInfo);

    // 메시지 핸들러 설정
    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('error', (error) => this.handleError(ws, error));
    ws.on('close', () => this.handleDisconnection(ws));

    // 하트비트 응답
    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.lastActiveAt = Date.now();
      }
    });
  }

  /**
   * 메시지 처리
   */
  private async handleMessage(ws: WebSocket, data: Buffer | ArrayBuffer | Buffer[]): Promise<void> {
    try {
      const client = this.clients.get(ws);
      if (!client) return;

      // 활동 시간 업데이트
      client.lastActiveAt = Date.now();

      const message = JSON.parse(data.toString()) as WebSocketMessage;
      logger.debug('WebSocket 메시지 수신', {
        type: message.type,
        userId: client.userId,
      });

      // 메시지 타입별 처리
      switch (message.type) {
        case 'ping':
          await this.handlePing(ws);
          break;

        case 'annotation:start':
        case 'annotation:update':
          await this.handleAnnotationUpdate(message, client);
          break;

        case 'annotation:complete':
          await this.handleAnnotationComplete(message as AnnotationCompleteMessage, client);
          break;

        case 'annotation:undo':
        case 'annotation:redo':
          await this.handleAnnotationAction(message, client);
          break;

        case 'command:send':
          await this.handleCommandSend(message as CommandSendMessage, client);
          break;

        case 'sync:request':
          await this.handleSyncRequest(ws, message as SyncRequestMessage, client);
          break;

        default:
          logger.warn('알 수 없는 메시지 타입', {
            type: message.type,
            userId: client.userId,
          });
          await this.sendError(ws, 'UNKNOWN_MESSAGE_TYPE', `알 수 없는 메시지 타입: ${message.type}`);
      }
    } catch (error) {
      logger.error('메시지 처리 실패', error);
      await this.sendError(ws, 'MESSAGE_PARSE_ERROR', '메시지 파싱 중 오류가 발생했습니다');
    }
  }

  /**
   * 핑 메시지 처리
   */
  private async handlePing(ws: WebSocket): Promise<void> {
    ws.send(
      JSON.stringify({
        type: 'pong',
        timestamp: Date.now(),
      }),
    );
  }

  /**
   * 실시간 주석 업데이트 처리 (Figma 스타일)
   */
  private async handleAnnotationUpdate(message: any, client: ClientInfo): Promise<void> {
    // 해당 찬양을 보고 있는 다른 클라이언트들에게 실시간 전송
    const messageWithUser = {
      ...message,
      userId: client.userId,
      userName: client.userName,
      timestamp: Date.now(),
    };

    this.broadcastToSong(message.songId, messageWithUser, client.userId);
  }

  /**
   * 주석 완료 처리 (데이터베이스 저장)
   */
  private async handleAnnotationComplete(message: AnnotationCompleteMessage, client: ClientInfo): Promise<void> {
    try {
      const db = getDatabase();

      // 주석을 데이터베이스에 저장
      const result = await db
        .insert(annotations)
        .values({
          songId: message.songId,
          userId: client.userId,
          userName: client.userName,
          layer: message.layer,
          svgPath: message.svgPath,
          color: message.color,
          tool: message.tool,
        })
        .returning();

      const savedAnnotation = result[0];

      // 저장된 주석 정보를 포함한 메시지로 브로드캐스트
      const completeMessage = {
        ...message,
        userId: client.userId,
        userName: client.userName,
        annotationId: savedAnnotation.id,
        timestamp: Date.now(),
      };

      this.broadcastToSong(message.songId, completeMessage, client.userId);

      logger.info('주석 저장 완료', {
        annotationId: savedAnnotation.id,
        userId: client.userId,
        songId: message.songId,
      });
    } catch (error) {
      logger.error('주석 저장 실패', error);
      await this.sendError(client, 'ANNOTATION_SAVE_ERROR', '주석 저장 중 오류가 발생했습니다');
    }
  }

  /**
   * 주석 실행 취소/다시 실행 처리
   */
  private async handleAnnotationAction(message: any, client: ClientInfo): Promise<void> {
    const messageWithUser = {
      ...message,
      userId: client.userId,
      userName: client.userName,
      timestamp: Date.now(),
    };

    this.broadcastToSong(message.songId, messageWithUser, client.userId);
  }

  /**
   * 명령 전송 처리
   */
  private async handleCommandSend(message: CommandSendMessage, client: ClientInfo): Promise<void> {
    try {
      const db = getDatabase();

      // 명령을 데이터베이스에 저장
      const result = await db
        .insert(commands)
        .values({
          userId: client.userId,
          userName: client.userName,
          message: message.message,
        })
        .returning();

      const savedCommand = result[0];

      // 모든 클라이언트에게 명령 브로드캐스트
      const broadcastMessage = {
        type: 'command:broadcast',
        userId: client.userId,
        userName: client.userName,
        message: message.message,
        commandId: savedCommand.id,
        timestamp: Date.now(),
      };

      this.broadcastToAll(broadcastMessage, client.userId);

      logger.info('명령 전송 완료', {
        commandId: savedCommand.id,
        userId: client.userId,
        message: message.message,
      });
    } catch (error) {
      logger.error('명령 전송 실패', error);
      await this.sendError(client, 'COMMAND_SEND_ERROR', '명령 전송 중 오류가 발생했습니다');
    }
  }

  /**
   * 데이터 동기화 요청 처리
   */
  private async handleSyncRequest(ws: WebSocket, message: SyncRequestMessage, client: ClientInfo): Promise<void> {
    try {
      const db = getDatabase();
      let data: any[] = [];

      switch (message.dataType) {
        case 'commands':
          // 최근 50개 명령 조회
          data = await db.select().from(commands).orderBy(desc(commands.createdAt)).limit(50);
          break;

        case 'annotations':
          // 현재 보고 있는 찬양의 주석들 (currentSong이 설정된 경우)
          if (client.currentSong) {
            data = await db
              .select()
              .from(annotations)
              .where(eq(annotations.songId, client.currentSong))
              .orderBy(desc(annotations.createdAt));
          }
          break;

        // 다른 데이터 타입은 Phase 2에서 구현
        default:
          data = [];
      }

      const syncResponse = {
        type: 'sync:response',
        dataType: message.dataType,
        data,
        lastSyncTime: new Date().toISOString(),
        timestamp: Date.now(),
      };

      ws.send(JSON.stringify(syncResponse));
    } catch (error) {
      logger.error('동기화 요청 처리 실패', error);
      await this.sendError(ws, 'SYNC_ERROR', '데이터 동기화 중 오류가 발생했습니다');
    }
  }

  /**
   * 특정 찬양을 보고 있는 클라이언트들에게 브로드캐스트
   */
  private broadcastToSong(songId: number, message: any, excludeUserId?: string): void {
    this.clients.forEach((client, ws) => {
      if (client.currentSong === songId && client.userId !== excludeUserId) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      }
    });
  }

  /**
   * 모든 클라이언트에게 브로드캐스트
   */
  private broadcastToAll(message: any, excludeUserId?: string): void {
    this.clients.forEach((client, ws) => {
      if (client.userId !== excludeUserId) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      }
    });
  }

  /**
   * 환영 메시지 전송
   */
  private async sendWelcomeMessage(ws: WebSocket): Promise<void> {
    const welcomeMessage = {
      type: 'welcome',
      message: '길튼 시스템에 연결되었습니다',
      serverInfo: {
        name: '길튼 시스템',
        version: '1.0.0',
        connectedUsers: this.clients.size,
      },
      timestamp: Date.now(),
    };

    ws.send(JSON.stringify(welcomeMessage));
  }

  /**
   * 사용자 접속 알림 브로드캐스트
   */
  private async broadcastUserConnect(client: ClientInfo): Promise<void> {
    const connectMessage = {
      type: 'user:connect',
      userId: client.userId,
      userName: client.userName,
      timestamp: Date.now(),
    };

    this.broadcastToAll(connectMessage, client.userId);

    // 서버 상태 업데이트 브로드캐스트
    await this.broadcastServerStatus();
  }

  /**
   * 서버 상태 브로드캐스트
   */
  private async broadcastServerStatus(): Promise<void> {
    const activeUsers = Array.from(this.clients.values()).map((client) => ({
      userId: client.userId,
      userName: client.userName,
    }));

    const statusMessage = {
      type: 'server:status',
      connectedUsers: this.clients.size,
      activeUsers,
      timestamp: Date.now(),
    };

    this.broadcastToAll(statusMessage);
  }

  /**
   * 에러 메시지 전송
   */
  private async sendError(wsOrClient: WebSocket | ClientInfo, code: string, message: string): Promise<void> {
    const errorMessage = {
      type: 'error',
      code,
      message,
      timestamp: Date.now(),
    };

    if (wsOrClient instanceof WebSocket) {
      wsOrClient.send(JSON.stringify(errorMessage));
    } else {
      // ClientInfo인 경우 해당하는 WebSocket 찾기
      for (const [ws, client] of this.clients.entries()) {
        if (client.userId === wsOrClient.userId) {
          ws.send(JSON.stringify(errorMessage));
          break;
        }
      }
    }
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  private async handleDisconnection(ws: WebSocket): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

    logger.info('WebSocket 클라이언트 연결 해제', {
      userId: client.userId,
      userName: client.userName,
    });

    // 다른 클라이언트들에게 연결 해제 알림
    const disconnectMessage = {
      type: 'user:disconnect',
      userId: client.userId,
      userName: client.userName,
      timestamp: Date.now(),
    };

    this.clients.delete(ws);
    this.broadcastToAll(disconnectMessage);
    await this.broadcastServerStatus();
  }

  /**
   * 에러 처리
   */
  private handleError(ws: WebSocket, error: Error): void {
    const client = this.clients.get(ws);
    logger.error('WebSocket 에러', {
      error: error.message,
      userId: client?.userId,
    });
  }

  /**
   * 하트비트 체크
   */
  private heartbeatCheck(): void {
    this.clients.forEach((_, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        this.clients.delete(ws);
      }
    });
  }

  /**
   * 비활성 클라이언트 정리 (5분 이상 비활성)
   */
  private cleanupInactiveClients(): void {
    const fiveMinutesAgo = Date.now() - 300000;

    this.clients.forEach((client, ws) => {
      if (client.lastActiveAt < fiveMinutesAgo) {
        logger.info('비활성 클라이언트 연결 해제', { userId: client.userId });
        ws.close();
        this.clients.delete(ws);
      }
    });
  }

  /**
   * 데이터베이스에 사용자 정보 저장/업데이트
   */
  private async updateUserInDatabase(userId: string, userName: string): Promise<void> {
    try {
      const db = getDatabase();

      // 기존 사용자 확인
      const existingUser = await db.select().from(users).where(eq(users.id, userId)).get();

      if (existingUser) {
        // 기존 사용자 활동 시간 업데이트
        await db
          .update(users)
          .set({
            name: userName,
            lastActiveAt: new Date().toISOString(),
          })
          .where(eq(users.id, userId));
      } else {
        // 새 사용자 생성
        await db.insert(users).values({
          id: userId,
          name: userName,
        });
      }
    } catch (error) {
      logger.error('사용자 정보 업데이트 실패', error);
    }
  }

  /**
   * 현재 접속자 수 반환
   */
  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * 접속된 사용자 목록 반환
   */
  public getConnectedUsers(): ClientInfo[] {
    return Array.from(this.clients.values());
  }
}
