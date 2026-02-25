import { useEffect, useRef, useCallback, useState } from 'react';
import { getSocket, setSheetRoom } from './useSocket';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  id: string;
  sheetId: string;
  profileId: string;
  color: string;
  width: number;
  points: Point[];
  isEraser: boolean;
}

interface RemoteInProgressPath {
  pathId: string;
  profileId: string;
  color: string;
  width: number;
  isEraser: boolean;
  points: Point[];
}

interface UseDrawingSyncOptions {
  sheetId: string | null;
  profileId: string | null;
  enabled: boolean;
}

export function useDrawingSync({ sheetId, profileId, enabled }: UseDrawingSyncOptions) {
  const [remotePaths, setRemotePaths] = useState<DrawingPath[]>([]);
  const [remoteInProgress, setRemoteInProgress] = useState<Map<string, RemoteInProgressPath>>(
    new Map(),
  );
  const currentSheetIdRef = useRef<string | null>(null);

  const socket = getSocket();

  // Sheet room 입장/퇴장
  useEffect(() => {
    if (!enabled || !sheetId) return;

    if (currentSheetIdRef.current && currentSheetIdRef.current !== sheetId) {
      socket.emit('leave:sheet', { sheetId: currentSheetIdRef.current });
    }

    currentSheetIdRef.current = sheetId;
    socket.emit('join:sheet', { sheetId });
    setSheetRoom({ sheetId });

    return () => {
      if (currentSheetIdRef.current) {
        socket.emit('leave:sheet', { sheetId: currentSheetIdRef.current });
        currentSheetIdRef.current = null;
        setSheetRoom(null);
      }
    };
  }, [sheetId, enabled, socket]);

  // Socket 이벤트 리스너
  useEffect(() => {
    if (!enabled) return;

    const handleState = (data: { sheetId: string; paths: DrawingPath[] }) => {
      if (data.sheetId === currentSheetIdRef.current) {
        setRemotePaths(data.paths);
      }
    };

    const handleStarted = (data: {
      sheetId: string;
      pathId: string;
      profileId: string;
      color: string;
      width: number;
      isEraser: boolean;
      point: Point;
    }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;

      setRemoteInProgress((prev) => {
        const next = new Map(prev);
        next.set(data.pathId, {
          pathId: data.pathId,
          profileId: data.profileId,
          color: data.color,
          width: data.width,
          isEraser: data.isEraser,
          points: [data.point],
        });
        return next;
      });
    };

    const handleMoved = (data: { sheetId: string; pathId: string; point: Point }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;

      setRemoteInProgress((prev) => {
        const existing = prev.get(data.pathId);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(data.pathId, {
          ...existing,
          points: [...existing.points, data.point],
        });
        return next;
      });
    };

    const handleEnded = (data: {
      sheetId: string;
      pathId: string;
      id: string;
      profileId: string;
      color: string;
      width: number;
      isEraser: boolean;
      points: Point[];
    }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;

      // 진행 중 제거
      setRemoteInProgress((prev) => {
        const next = new Map(prev);
        next.delete(data.pathId);
        return next;
      });

      // 완료된 path 추가
      const path: DrawingPath = {
        id: data.id || data.pathId,
        sheetId: data.sheetId,
        profileId: data.profileId,
        color: data.color,
        width: data.width,
        points: data.points,
        isEraser: data.isEraser,
      };
      setRemotePaths((prev) => [...prev, path]);
    };

    const handleDeleted = (data: { sheetId: string; pathId: string }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;
      setRemotePaths((prev) => prev.filter((p) => p.id !== data.pathId));
    };

    const handleCleared = (data: {
      sheetId: string;
      profileId: string;
      deletedPathIds: string[];
    }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;
      const deletedSet = new Set(data.deletedPathIds);
      setRemotePaths((prev) => prev.filter((p) => !deletedSet.has(p.id)));
    };

    socket.on('drawing:state', handleState);
    socket.on('drawing:started', handleStarted);
    socket.on('drawing:moved', handleMoved);
    socket.on('drawing:ended', handleEnded);
    socket.on('drawing:deleted', handleDeleted);
    socket.on('drawing:cleared', handleCleared);

    return () => {
      socket.off('drawing:state', handleState);
      socket.off('drawing:started', handleStarted);
      socket.off('drawing:moved', handleMoved);
      socket.off('drawing:ended', handleEnded);
      socket.off('drawing:deleted', handleDeleted);
      socket.off('drawing:cleared', handleCleared);
    };
  }, [enabled, profileId, socket]);

  // 드로잉 시작 전송
  const emitDrawStart = useCallback(
    (data: {
      pathId: string;
      color: string;
      width: number;
      isEraser: boolean;
      point: Point;
    }) => {
      if (!sheetId || !profileId) return;
      socket.emit('drawing:start', { sheetId, profileId, ...data });
    },
    [sheetId, profileId, socket],
  );

  // 드로잉 이동 전송 (스로틀링은 호출하는 쪽에서)
  const emitDrawMove = useCallback(
    (data: { pathId: string; point: Point }) => {
      if (!sheetId) return;
      socket.emit('drawing:move', { sheetId, ...data });
    },
    [sheetId, socket],
  );

  // 드로잉 완료 전송
  const emitDrawEnd = useCallback(
    (data: {
      pathId: string;
      color: string;
      width: number;
      isEraser: boolean;
      points: Point[];
    }) => {
      if (!sheetId || !profileId) return;
      socket.emit('drawing:end', { sheetId, profileId, ...data });
    },
    [sheetId, profileId, socket],
  );

  // 드로잉 삭제 전송
  const emitDrawDelete = useCallback(
    (pathId: string) => {
      if (!sheetId) return;
      socket.emit('drawing:delete', { sheetId, pathId });
    },
    [sheetId, socket],
  );

  // 내 드로잉 전체 삭제 전송
  const emitDrawClear = useCallback(() => {
    if (!sheetId || !profileId) return;
    socket.emit('drawing:clear', { sheetId, profileId });
  }, [sheetId, profileId, socket]);

  return {
    remotePaths,
    remoteInProgress: Array.from(remoteInProgress.values()),
    emitDrawStart,
    emitDrawMove,
    emitDrawEnd,
    emitDrawDelete,
    emitDrawClear,
  };
}
