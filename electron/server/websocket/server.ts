// WebSocket 서버 (피그마 스타일 실시간 협업)

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { roomManager } from './roomManager.js';
import type {
  ClientToServerEvent,
  ServerToClientEvent,
  PendingStroke,
  StrokePoint,
} from './types.js';

// 진행 중인 스트로크 버퍼 (profileId:strokeId -> points)
const pendingStrokes: Map<string, PendingStroke> = new Map();

// 포인트 배치 전송 간격 (ms)
const BATCH_INTERVAL = 50;

// WebSocket 서버 초기화
export function initWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
  });

  console.log('[WebSocket] 서버 초기화 완료 (경로: /ws)');

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] 새 연결');

    ws.on('message', (data: Buffer) => {
      try {
        const event = JSON.parse(data.toString()) as ClientToServerEvent;
        handleEvent(ws, event);
      } catch (error) {
        console.error('[WebSocket] 메시지 파싱 오류:', error);
        sendError(ws, '잘못된 메시지 형식');
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] 연결 종료');
      roomManager.leave(ws);
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] 오류:', error);
      roomManager.leave(ws);
    });
  });

  // 주기적으로 포인트 배치 전송
  setInterval(() => {
    flushPendingStrokes();
  }, BATCH_INTERVAL);

  // 비활성 클라이언트 정리 (1분)
  setInterval(() => {
    roomManager.cleanupInactive(60000);
  }, 30000);

  return wss;
}

// 이벤트 핸들러
function handleEvent(ws: WebSocket, event: ClientToServerEvent): void {
  roomManager.updateActivity(ws);

  switch (event.type) {
    case 'join':
      handleJoin(ws, event);
      break;

    case 'leave':
      handleLeave(ws);
      break;

    case 'stroke:start':
      handleStrokeStart(ws, event);
      break;

    case 'stroke:point':
      handleStrokePoint(ws, event);
      break;

    case 'stroke:end':
      handleStrokeEnd(ws, event);
      break;

    case 'stroke:delete':
      handleStrokeDelete(ws, event);
      break;

    case 'cursor:move':
      handleCursorMove(ws, event);
      break;

    case 'ping':
      send(ws, { type: 'pong' });
      break;

    default:
      sendError(ws, '알 수 없는 이벤트');
  }
}

// Room 참가
function handleJoin(
  ws: WebSocket,
  event: Extract<ClientToServerEvent, { type: 'join' }>
): void {
  const { profileId, profileName, profileColor, songId } = event;

  const participants = roomManager.join(ws, profileId, profileName, profileColor, songId);

  send(ws, { type: 'joined', participants });

  console.log(`[WebSocket] ${profileName} 참가 (songId: ${songId})`);
}

// Room 퇴장
function handleLeave(ws: WebSocket): void {
  const client = roomManager.getClientByWs(ws);
  if (client) {
    console.log(`[WebSocket] ${client.profileName} 퇴장`);
  }
  roomManager.leave(ws);
}

// 스트로크 시작
function handleStrokeStart(
  ws: WebSocket,
  event: Extract<ClientToServerEvent, { type: 'stroke:start' }>
): void {
  const client = roomManager.getClientByWs(ws);
  if (!client || !client.songId) return;

  const { strokeId, tool, color, thickness } = event;
  const key = `${client.profileId}:${strokeId}`;

  // 펜딩 스트로크 생성
  pendingStrokes.set(key, {
    strokeId,
    profileId: client.profileId,
    tool,
    color,
    thickness,
    points: [],
    startTime: Date.now(),
  });

  // 다른 참여자들에게 알림
  roomManager.broadcastToRoom(client.songId, client.profileId, {
    type: 'stroke:started',
    profileId: client.profileId,
    strokeId,
    tool,
    color,
    thickness,
  });
}

// 스트로크 포인트 추가
function handleStrokePoint(
  ws: WebSocket,
  event: Extract<ClientToServerEvent, { type: 'stroke:point' }>
): void {
  const client = roomManager.getClientByWs(ws);
  if (!client) return;

  const { strokeId, x, y, pressure } = event;
  const key = `${client.profileId}:${strokeId}`;
  const pending = pendingStrokes.get(key);

  if (pending) {
    pending.points.push({ x, y, pressure });
  }
}

// 스트로크 종료
function handleStrokeEnd(
  ws: WebSocket,
  event: Extract<ClientToServerEvent, { type: 'stroke:end' }>
): void {
  const client = roomManager.getClientByWs(ws);
  if (!client || !client.songId) return;

  const { strokeId, svgPath } = event;
  const key = `${client.profileId}:${strokeId}`;

  // 남은 포인트 전송
  const pending = pendingStrokes.get(key);
  if (pending && pending.points.length > 0) {
    roomManager.broadcastToRoom(client.songId, client.profileId, {
      type: 'stroke:points',
      profileId: client.profileId,
      strokeId,
      points: pending.points,
    });
  }

  // 펜딩 스트로크 삭제
  pendingStrokes.delete(key);

  // 완료된 SVG path 전송
  roomManager.broadcastToRoom(client.songId, client.profileId, {
    type: 'stroke:ended',
    profileId: client.profileId,
    strokeId,
    svgPath,
  });
}

// 스트로크 삭제
function handleStrokeDelete(
  ws: WebSocket,
  event: Extract<ClientToServerEvent, { type: 'stroke:delete' }>
): void {
  const client = roomManager.getClientByWs(ws);
  if (!client || !client.songId) return;

  const { strokeId } = event;

  roomManager.broadcastToRoom(client.songId, client.profileId, {
    type: 'stroke:deleted',
    profileId: client.profileId,
    strokeId,
  });
}

// 커서 이동
function handleCursorMove(
  ws: WebSocket,
  event: Extract<ClientToServerEvent, { type: 'cursor:move' }>
): void {
  const client = roomManager.getClientByWs(ws);
  if (!client || !client.songId) return;

  const { x, y } = event;

  roomManager.broadcastToRoom(client.songId, client.profileId, {
    type: 'cursor:moved',
    profileId: client.profileId,
    x,
    y,
  });
}

// 버퍼링된 포인트 일괄 전송
function flushPendingStrokes(): void {
  pendingStrokes.forEach((pending, _key) => {
    if (pending.points.length === 0) return;

    const client = roomManager.getClientByProfileId(pending.profileId);
    if (!client || !client.songId) return;

    // 배치로 포인트 전송
    const points: StrokePoint[] = pending.points.splice(0, pending.points.length);

    roomManager.broadcastToRoom(client.songId, client.profileId, {
      type: 'stroke:points',
      profileId: pending.profileId,
      strokeId: pending.strokeId,
      points,
    });
  });
}

// 메시지 전송
function send(ws: WebSocket, event: ServerToClientEvent): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

// 에러 메시지 전송
function sendError(ws: WebSocket, message: string): void {
  send(ws, { type: 'error', message });
}

export default initWebSocketServer;
