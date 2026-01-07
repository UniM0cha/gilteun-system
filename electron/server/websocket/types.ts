// WebSocket 타입 정의

import type { WebSocket } from 'ws';

// 연결된 클라이언트 정보
export interface ConnectedClient {
  ws: WebSocket;
  profileId: string;
  profileName: string;
  profileColor: string;
  songId: string | null;
  lastActivity: number;
}

// Room 정보 (songId 기반)
export interface Room {
  songId: string;
  clients: Map<string, ConnectedClient>; // profileId -> client
}

// 스트로크 포인트
export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

// 클라이언트 → 서버 이벤트
export type ClientToServerEvent =
  | { type: 'join'; profileId: string; profileName: string; profileColor: string; songId: string }
  | { type: 'leave' }
  | { type: 'stroke:start'; strokeId: string; tool: string; color: string; thickness: number }
  | { type: 'stroke:point'; strokeId: string; x: number; y: number; pressure?: number }
  | { type: 'stroke:end'; strokeId: string; svgPath: string }
  | { type: 'stroke:delete'; strokeId: string }
  | { type: 'cursor:move'; x: number; y: number }
  | { type: 'ping' };

// 서버 → 클라이언트 이벤트
export type ServerToClientEvent =
  | { type: 'joined'; participants: ParticipantInfo[] }
  | { type: 'participant:joined'; participant: ParticipantInfo }
  | { type: 'participant:left'; profileId: string }
  | { type: 'stroke:started'; profileId: string; strokeId: string; tool: string; color: string; thickness: number }
  | { type: 'stroke:points'; profileId: string; strokeId: string; points: StrokePoint[] }
  | { type: 'stroke:ended'; profileId: string; strokeId: string; svgPath: string }
  | { type: 'stroke:deleted'; profileId: string; strokeId: string }
  | { type: 'cursor:moved'; profileId: string; x: number; y: number }
  | { type: 'error'; message: string }
  | { type: 'pong' };

// 참여자 정보
export interface ParticipantInfo {
  profileId: string;
  profileName: string;
  profileColor: string;
}

// 진행 중인 스트로크 (버퍼링용)
export interface PendingStroke {
  strokeId: string;
  profileId: string;
  tool: string;
  color: string;
  thickness: number;
  points: StrokePoint[];
  startTime: number;
}
