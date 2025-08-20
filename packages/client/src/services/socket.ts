import { io, Socket } from 'socket.io-client';
import type { Command, DrawingData, PageNavigation } from '@gilton/shared';

// Socket.io 이벤트 타입 정의
interface SocketEvents {
  // 클라이언트 → 서버
  'user:join': (data: { userId: string; worshipId: string }) => void;
  'score:page-change': (data: { page: number; userId: string }) => void;
  'score:drawing': (data: DrawingData) => void;
  'command:send': (data: Omit<Command, 'id' | 'timestamp' | 'expiresAt'>) => void;
  
  // 서버 → 클라이언트
  'command:received': (data: Command) => void;
  'score:sync': (data: { scoreId: string; drawings: DrawingData[] }) => void;
  'users:update': (data: unknown[]) => void;
  'page:update': (data: PageNavigation) => void;
}

export class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;
  private isConnected = false;

  constructor(serverUrl = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
      });

      this.socket.on('connect', () => {
        console.log('서버에 연결되었습니다:', this.socket?.id);
        this.isConnected = true;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('서버 연결이 해제되었습니다:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('서버 연결 오류:', error);
        this.isConnected = false;
        reject(error);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // 예배 참가
  joinWorship(userId: string, worshipId: string): void {
    this.emit('user:join', { userId, worshipId });
  }

  // 페이지 변경 알림
  changePageNotify(page: number, userId: string): void {
    this.emit('score:page-change', { page, userId });
  }

  // 드로잉 데이터 전송
  sendDrawing(drawingData: DrawingData): void {
    this.emit('score:drawing', drawingData);
  }

  // 명령 전송
  sendCommand(command: Omit<Command, 'id' | 'timestamp' | 'expiresAt'>): void {
    this.emit('command:send', command);
  }

  // 이벤트 리스너 등록
  onCommandReceived(callback: (command: Command) => void): void {
    this.on('command:received', callback);
  }

  onScoreSync(callback: (data: { scoreId: string; drawings: DrawingData[] }) => void): void {
    this.on('score:sync', callback);
  }

  onUsersUpdate(callback: (users: unknown[]) => void): void {
    this.on('users:update', callback);
  }

  onPageUpdate(callback: (navigation: PageNavigation) => void): void {
    this.on('page:update', callback);
  }

  // 이벤트 리스너 제거
  offCommandReceived(callback: (command: Command) => void): void {
    this.off('command:received', callback);
  }

  offScoreSync(callback: (data: { scoreId: string; drawings: DrawingData[] }) => void): void {
    this.off('score:sync', callback);
  }

  offUsersUpdate(callback: (users: unknown[]) => void): void {
    this.off('users:update', callback);
  }

  offPageUpdate(callback: (navigation: PageNavigation) => void): void {
    this.off('page:update', callback);
  }

  // 연결 상태 확인
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Private 헬퍼 메서드
  private emit<K extends keyof SocketEvents>(event: K, data: Parameters<SocketEvents[K]>[0]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Socket not connected. Cannot emit event: ${event}`);
    }
  }

  private on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    this.socket?.on(event as string, callback as (...args: unknown[]) => void);
  }

  private off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    this.socket?.off(event as string, callback as (...args: unknown[]) => void);
  }
}

// 싱글톤 인스턴스
let socketInstance: SocketService | null = null;

export const getSocketService = (): SocketService => {
  if (!socketInstance) {
    socketInstance = new SocketService();
  }
  return socketInstance;
};