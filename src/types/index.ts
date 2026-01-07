// 공통 타입 정의

// 프로필 역할
export type ProfileRole = 'admin' | 'leader' | 'member';

// 주석 도구
export type AnnotationTool = 'pen' | 'highlighter' | 'eraser' | 'text' | 'shape';

// 프로필
export interface Profile {
  id: string;
  name: string;
  role: ProfileRole;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// 예배
export interface Worship {
  id: string;
  title: string;
  date: string;
  time: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

// 찬양
export interface Song {
  id: string;
  worshipId: string;
  title: string;
  key: string | null;
  memo: string | null;
  imagePath: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

// 주석
export interface Annotation {
  id: string;
  songId: string;
  profileId: string;
  svgPath: string;
  color: string;
  tool: AnnotationTool;
  strokeWidth: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// 명령
export interface Command {
  id: string;
  worshipId: string;
  profileId: string;
  message: string;
  createdAt: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
  message?: string;
}

// 프로필 요청 타입
export interface CreateProfileRequest {
  name: string;
  role: ProfileRole;
  icon: string;
  color: string;
}

export interface UpdateProfileRequest {
  name?: string;
  role?: ProfileRole;
  icon?: string;
  color?: string;
}

// 예배 요청 타입
export interface CreateWorshipRequest {
  title: string;
  date: string;
  time?: string;
  memo?: string;
}

export interface UpdateWorshipRequest {
  title?: string;
  date?: string;
  time?: string | null;
  memo?: string | null;
}

// 찬양 요청 타입
export interface CreateSongRequest {
  worshipId: string;
  title: string;
  key?: string;
  memo?: string;
  imagePath?: string;
}

export interface UpdateSongRequest {
  title?: string;
  key?: string | null;
  memo?: string | null;
  imagePath?: string | null;
  orderIndex?: number;
}

// 주석 요청 타입
export interface CreateAnnotationRequest {
  songId: string;
  profileId: string;
  svgPath: string;
  color: string;
  tool: AnnotationTool;
  strokeWidth?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateAnnotationRequest {
  svgPath?: string;
  color?: string;
  strokeWidth?: number | null;
  metadata?: Record<string, unknown> | null;
}

// WebSocket 연결 상태
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
