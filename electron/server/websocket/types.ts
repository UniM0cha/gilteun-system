/**
 * WebSocket 메시지 타입 정의
 * 길튼 시스템 실시간 통신 프로토콜
 */

export interface BaseMessage {
  type: string;
  timestamp: number;
  userId?: string;
  userName?: string;
}

// 연결 관리 메시지
export interface WelcomeMessage extends BaseMessage {
  type: 'welcome';
  message: string;
  serverInfo: {
    name: string;
    version: string;
    connectedUsers: number;
  };
}

export interface UserConnectMessage extends BaseMessage {
  type: 'user:connect';
  userId: string;
  userName: string;
}

export interface UserDisconnectMessage extends BaseMessage {
  type: 'user:disconnect';
  userId: string;
  userName: string;
}

export interface ServerStatusMessage extends BaseMessage {
  type: 'server:status';
  connectedUsers: number;
  activeUsers: string[];
}

// 실시간 주석 메시지 (Figma 스타일)
export interface AnnotationStartMessage extends BaseMessage {
  type: 'annotation:start';
  songId: number;
  userId: string;
  userName: string;
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  layer: string;
}

export interface AnnotationUpdateMessage extends BaseMessage {
  type: 'annotation:update';
  songId: number;
  userId: string;
  userName: string;
  svgPath: string;
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
}

export interface AnnotationCompleteMessage extends BaseMessage {
  type: 'annotation:complete';
  songId: number;
  userId: string;
  userName: string;
  svgPath: string;
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  layer: string;
  annotationId?: number;
}

export interface AnnotationUndoMessage extends BaseMessage {
  type: 'annotation:undo';
  songId: number;
  userId: string;
  userName: string;
  annotationId: number;
}

export interface AnnotationRedoMessage extends BaseMessage {
  type: 'annotation:redo';
  songId: number;
  userId: string;
  userName: string;
  annotationId: number;
}

// 명령 시스템 메시지
export interface CommandSendMessage extends BaseMessage {
  type: 'command:send';
  userId: string;
  userName: string;
  message: string;
  commandId?: number;
}

export interface CommandBroadcastMessage extends BaseMessage {
  type: 'command:broadcast';
  userId: string;
  userName: string;
  message: string;
  commandId: number;
}

// 데이터 동기화 메시지
export interface SyncRequestMessage extends BaseMessage {
  type: 'sync:request';
  dataType: 'worships' | 'songs' | 'annotations' | 'commands';
  lastSyncTime?: string;
}

export interface SyncResponseMessage extends BaseMessage {
  type: 'sync:response';
  dataType: 'worships' | 'songs' | 'annotations' | 'commands';
  data: any[];
  lastSyncTime: string;
}

// 기타 메시지
export interface PingMessage extends BaseMessage {
  type: 'ping';
}

export interface PongMessage extends BaseMessage {
  type: 'pong';
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  code: string;
  message: string;
  details?: any;
}

// 모든 메시지 타입의 유니온
export type WebSocketMessage =
  | WelcomeMessage
  | UserConnectMessage
  | UserDisconnectMessage
  | ServerStatusMessage
  | AnnotationStartMessage
  | AnnotationUpdateMessage
  | AnnotationCompleteMessage
  | AnnotationUndoMessage
  | AnnotationRedoMessage
  | CommandSendMessage
  | CommandBroadcastMessage
  | SyncRequestMessage
  | SyncResponseMessage
  | PingMessage
  | PongMessage
  | ErrorMessage;

// 클라이언트 정보
export interface ClientInfo {
  userId: string;
  userName: string;
  connectedAt: number;
  lastActiveAt: number;
  currentSong?: number;
}
