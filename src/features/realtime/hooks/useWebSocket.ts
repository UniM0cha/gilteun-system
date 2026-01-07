// WebSocket 연결 관리 훅

import { useEffect, useRef, useCallback, useState } from 'react';
import { CONFIG } from '@/constants/config';
import type {
  ClientEvent,
  ServerEvent,
  ConnectionStatus,
  Participant,
  RemoteCursor,
  RemoteStroke,
  StrokePoint,
} from '../types';

interface UseWebSocketOptions {
  // 프로필 정보
  profileId: string;
  profileName: string;
  profileColor: string;
  // 현재 보고 있는 악보
  songId: string;
  // 이벤트 핸들러
  onStrokeStarted?: (profileId: string, strokeId: string, tool: string, color: string, thickness: number) => void;
  onStrokePoints?: (profileId: string, strokeId: string, points: StrokePoint[]) => void;
  onStrokeEnded?: (profileId: string, strokeId: string, svgPath: string) => void;
  onStrokeDeleted?: (profileId: string, strokeId: string) => void;
}

interface UseWebSocketReturn {
  // 연결 상태
  status: ConnectionStatus;
  // 참여자 목록
  participants: Participant[];
  // 원격 커서 목록
  remoteCursors: Map<string, RemoteCursor>;
  // 진행 중인 원격 스트로크
  remoteStrokes: Map<string, RemoteStroke>;
  // 메서드
  sendStrokeStart: (strokeId: string, tool: string, color: string, thickness: number) => void;
  sendStrokePoint: (strokeId: string, x: number, y: number, pressure?: number) => void;
  sendStrokeEnd: (strokeId: string, svgPath: string) => void;
  sendStrokeDelete: (strokeId: string) => void;
  sendCursorMove: (x: number, y: number) => void;
}

// WebSocket URL 생성
function getWebSocketUrl(): string {
  // CONFIG.WS_URL 사용 (ws://localhost:3001)
  return `${CONFIG.WS_URL}/ws`;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    profileId,
    profileName,
    profileColor,
    songId,
    onStrokeStarted,
    onStrokePoints,
    onStrokeEnded,
    onStrokeDeleted,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  // 최신 콜백을 refs에 저장 (의존성 안정화)
  const callbacksRef = useRef({ onStrokeStarted, onStrokePoints, onStrokeEnded, onStrokeDeleted });
  callbacksRef.current = { onStrokeStarted, onStrokePoints, onStrokeEnded, onStrokeDeleted };

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [remoteStrokes, setRemoteStrokes] = useState<Map<string, RemoteStroke>>(new Map());

  // 참여자 ref (이벤트 핸들러에서 사용)
  const participantsRef = useRef<Participant[]>([]);
  participantsRef.current = participants;

  // 메시지 전송
  const send = useCallback((event: ClientEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  // 연결 시작/종료
  useEffect(() => {
    if (!profileId || !songId) return;

    // 연결 중이거나 이미 연결된 경우 스킵
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setStatus('connecting');
    const ws = new WebSocket(getWebSocketUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      // Room 참가
      ws.send(JSON.stringify({
        type: 'join',
        profileId,
        profileName,
        profileColor,
        songId,
      }));

      // 핑 인터벌 시작 (30초마다)
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (messageEvent) => {
      try {
        const event = JSON.parse(messageEvent.data as string) as ServerEvent;

        // 이벤트 처리 (인라인으로 처리하여 의존성 문제 해결)
        switch (event.type) {
          case 'joined':
            setParticipants(event.participants);
            break;

          case 'participant:joined':
            setParticipants((prev) => [...prev, event.participant]);
            break;

          case 'participant:left':
            setParticipants((prev) => prev.filter((p) => p.profileId !== event.profileId));
            setRemoteCursors((prev) => {
              const next = new Map(prev);
              next.delete(event.profileId);
              return next;
            });
            setRemoteStrokes((prev) => {
              const next = new Map(prev);
              for (const key of next.keys()) {
                if (key.startsWith(event.profileId + ':')) {
                  next.delete(key);
                }
              }
              return next;
            });
            break;

          case 'stroke:started': {
            const participant = participantsRef.current.find((p) => p.profileId === event.profileId);
            const stroke: RemoteStroke = {
              strokeId: event.strokeId,
              profileId: event.profileId,
              profileColor: participant?.profileColor ?? '#999999',
              tool: event.tool,
              color: event.color,
              thickness: event.thickness,
              points: [],
            };
            setRemoteStrokes((prev) => new Map(prev).set(`${event.profileId}:${event.strokeId}`, stroke));
            callbacksRef.current.onStrokeStarted?.(event.profileId, event.strokeId, event.tool, event.color, event.thickness);
            break;
          }

          case 'stroke:points': {
            const key = `${event.profileId}:${event.strokeId}`;
            setRemoteStrokes((prev) => {
              const next = new Map(prev);
              const stroke = next.get(key);
              if (stroke) {
                stroke.points = [...stroke.points, ...event.points];
              }
              return next;
            });
            callbacksRef.current.onStrokePoints?.(event.profileId, event.strokeId, event.points);
            break;
          }

          case 'stroke:ended': {
            const key = `${event.profileId}:${event.strokeId}`;
            setRemoteStrokes((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            callbacksRef.current.onStrokeEnded?.(event.profileId, event.strokeId, event.svgPath);
            break;
          }

          case 'stroke:deleted':
            callbacksRef.current.onStrokeDeleted?.(event.profileId, event.strokeId);
            break;

          case 'cursor:moved': {
            const participant = participantsRef.current.find((p) => p.profileId === event.profileId);
            setRemoteCursors((prev) => {
              const next = new Map(prev);
              next.set(event.profileId, {
                profileId: event.profileId,
                profileName: participant?.profileName ?? '알 수 없음',
                profileColor: participant?.profileColor ?? '#999999',
                x: event.x,
                y: event.y,
                lastUpdate: Date.now(),
              });
              return next;
            });
            break;
          }

          case 'error':
            console.error('[WebSocket] 서버 오류:', event.message);
            break;

          case 'pong':
            // 핑-퐁 응답
            break;
        }
      } catch (error) {
        console.error('[WebSocket] 메시지 파싱 오류:', error);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      // 재연결은 하지 않음 (무한 루프 방지)
      // 페이지 새로고침이나 다시 마운트시 재연결됨
    };

    ws.onerror = () => {
      setStatus('error');
    };

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [profileId, profileName, profileColor, songId]);

  // 오래된 커서 정리 (5초 이상 미갱신)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        for (const [key, cursor] of next) {
          if (now - cursor.lastUpdate > 5000) {
            next.delete(key);
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 메서드
  const sendStrokeStart = useCallback((strokeId: string, tool: string, color: string, thickness: number) => {
    send({ type: 'stroke:start', strokeId, tool, color, thickness });
  }, [send]);

  const sendStrokePoint = useCallback((strokeId: string, x: number, y: number, pressure?: number) => {
    send({ type: 'stroke:point', strokeId, x, y, pressure });
  }, [send]);

  const sendStrokeEnd = useCallback((strokeId: string, svgPath: string) => {
    send({ type: 'stroke:end', strokeId, svgPath });
  }, [send]);

  const sendStrokeDelete = useCallback((strokeId: string) => {
    send({ type: 'stroke:delete', strokeId });
  }, [send]);

  const sendCursorMove = useCallback((x: number, y: number) => {
    send({ type: 'cursor:move', x, y });
  }, [send]);

  return {
    status,
    participants,
    remoteCursors,
    remoteStrokes,
    sendStrokeStart,
    sendStrokePoint,
    sendStrokeEnd,
    sendStrokeDelete,
    sendCursorMove,
  };
}

export default useWebSocket;
