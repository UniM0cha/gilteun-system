// 실시간 협업 타입 정의 (클라이언트)

// 스트로크 포인트
export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

// 참여자 정보
export interface Participant {
  profileId: string;
  profileName: string;
  profileColor: string;
}

// 원격 커서 정보
export interface RemoteCursor {
  profileId: string;
  profileName: string;
  profileColor: string;
  x: number;
  y: number;
  lastUpdate: number;
}

// 진행 중인 원격 스트로크
export interface RemoteStroke {
  strokeId: string;
  profileId: string;
  profileColor: string;
  tool: string;
  color: string;
  thickness: number;
  points: StrokePoint[];
}

// 클라이언트 → 서버 이벤트
export type ClientEvent =
  | { type: 'join'; profileId: string; profileName: string; profileColor: string; songId: string }
  | { type: 'leave' }
  | { type: 'stroke:start'; strokeId: string; tool: string; color: string; thickness: number }
  | { type: 'stroke:point'; strokeId: string; x: number; y: number; pressure?: number }
  | { type: 'stroke:end'; strokeId: string; svgPath: string }
  | { type: 'stroke:delete'; strokeId: string }
  | { type: 'cursor:move'; x: number; y: number }
  | { type: 'ping' };

// 서버 → 클라이언트 이벤트
export type ServerEvent =
  | { type: 'joined'; participants: Participant[] }
  | { type: 'participant:joined'; participant: Participant }
  | { type: 'participant:left'; profileId: string }
  | { type: 'stroke:started'; profileId: string; strokeId: string; tool: string; color: string; thickness: number }
  | { type: 'stroke:points'; profileId: string; strokeId: string; points: StrokePoint[] }
  | { type: 'stroke:ended'; profileId: string; strokeId: string; svgPath: string }
  | { type: 'stroke:deleted'; profileId: string; strokeId: string }
  | { type: 'cursor:moved'; profileId: string; x: number; y: number }
  | { type: 'error'; message: string }
  | { type: 'pong' };

// WebSocket 연결 상태
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
