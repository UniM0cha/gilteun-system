// 길튼 시스템 타입 정의

// 예배 정보
export interface Worship {
  id: number;
  title: string;
  date: string;
  time?: string;
  description?: string;
  createdAt: string;
  songsCount: number;
}

export interface CreateWorshipData {
  title: string;
  date: string;
  time?: string;
  description?: string;
}

// 찬양 정보
export interface Song {
  id: number;
  worshipId: number;
  title: string;
  key?: string;
  memo?: string;
  imagePath?: string;
  order: number;
  createdAt: string;
  worshipTitle?: string;
  worshipDate?: string;
}

export interface CreateSongData {
  worshipId: number;
  title: string;
  key?: string;
  memo?: string;
  order?: number;
}

// API Request/Response types
export interface CreateWorshipRequest {
  title: string;
  date: string;
  time?: string;
  description?: string;
}

export interface UpdateWorshipRequest {
  title?: string;
  date?: string;
  time?: string;
  description?: string;
}

export interface CreateSongRequest {
  worshipId: number;
  title: string;
  key?: string;
  memo?: string;
  order?: number;
}

export interface UpdateSongRequest {
  title?: string;
  key?: string;
  memo?: string;
  order?: number;
}

export interface CreateAnnotationRequest {
  songId: number;
  userId: string;
  userName: string;
  layer: string;
  svgPath: string;
  color: string;
  tool: 'pen' | 'highlighter' | 'eraser';
}

export interface UpdateAnnotationRequest {
  layer?: string;
  svgPath?: string;
  color?: string;
  tool?: 'pen' | 'highlighter' | 'eraser';
}

// 주석 정보
export interface Annotation {
  id: number;
  songId: number;
  userId: string;
  userName: string;
  layer: string;
  svgPath: string;
  color: string;
  tool: 'pen' | 'highlighter' | 'eraser';
  opacity?: number;
  createdAt: string;
}

// 사용자 정보
export interface User {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  lastActiveAt: string;
}

// 명령 정보
export interface Command {
  id: number;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

// WebSocket 메시지 타입 (server와 동일)
export interface BaseMessage {
  type: string;
  timestamp: number;
  userId?: string;
  userName?: string;
}

export interface WebSocketMessage extends BaseMessage {
  [key: string]: any;
}

// 연결 상태
export type ConnectionStatus = 'disconnected' | 'connected' | 'connecting' | 'reconnecting' | 'error';

// 서버 정보
export interface ServerInfo {
  url: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  connectedUsers: number;
  lastPing: number;
  version?: string;
}

// 그리기 도구
export type DrawingTool = 'pen' | 'highlighter' | 'eraser';

// 화면 상태
export type ViewMode = 'fit' | 'width' | 'height' | 'custom';

// 페이지 타입
export type PageType =
  | 'profile-select'
  | 'worship-list'
  | 'song-list'
  | 'score-viewer'
  | 'command-editor'
  | 'admin'
  | 'settings';

// API 응답 타입
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}


// 터치 제스처
export interface GestureState {
  scale: number;
  x: number;
  y: number;
  rotating: boolean;
  scaling: boolean;
  dragging: boolean;
}

// 설정 정보
export interface AppSettings {
  serverUrl: string;
  userName: string;
  userId: string;
  autoConnect: boolean;
  gesturesEnabled: boolean;
  pencilEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: 'ko' | 'en';
}

// 에러 타입
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}
