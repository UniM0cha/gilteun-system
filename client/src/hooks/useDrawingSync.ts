import { useEffect, useRef, useCallback, useState } from "react";
import { getSocket, setSheetRoom } from "./useSocket";

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

interface UndoAction {
  added: DrawingPath[];
  deleted: DrawingPath[];
}

interface UseDrawingSyncOptions {
  sheetId: string | null;
  profileId: string | null;
  enabled: boolean;
}

export function useDrawingSync({ sheetId, profileId, enabled }: UseDrawingSyncOptions) {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [remoteInProgress, setRemoteInProgress] = useState<Map<string, RemoteInProgressPath>>(new Map());
  const [, setUndoStack] = useState<UndoAction[]>([]);
  const [, setRedoStack] = useState<UndoAction[]>([]);
  const currentSheetIdRef = useRef<string | null>(null);
  const batchRef = useRef<DrawingPath[] | null>(null);

  const socket = getSocket();

  // Sheet room 입장/퇴장
  useEffect(() => {
    if (!enabled || !sheetId) return;

    if (currentSheetIdRef.current && currentSheetIdRef.current !== sheetId) {
      socket.emit("leave:sheet", { sheetId: currentSheetIdRef.current });
    }

    currentSheetIdRef.current = sheetId;
    socket.emit("join:sheet", { sheetId });
    setSheetRoom({ sheetId });

    // 시트 전환 시 undo/redo 초기화
    setUndoStack([]);
    setRedoStack([]);

    return () => {
      if (currentSheetIdRef.current) {
        socket.emit("leave:sheet", { sheetId: currentSheetIdRef.current });
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
        setPaths(data.paths);
        setUndoStack([]);
        setRedoStack([]);
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

      // 완료된 path 추가 (socket.to → 발신자 제외, 타인 획만 수신)
      const path: DrawingPath = {
        id: data.id || data.pathId,
        sheetId: data.sheetId,
        profileId: data.profileId,
        color: data.color,
        width: data.width,
        points: data.points,
        isEraser: data.isEraser,
      };
      setPaths((prev) => [...prev, path]);
    };

    const handleDeleted = (data: { sheetId: string; pathId: string }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;
      setPaths((prev) => prev.filter((p) => p.id !== data.pathId));
    };

    const handleCleared = (data: { sheetId: string; profileId: string; deletedPathIds: string[] }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;
      const deletedSet = new Set(data.deletedPathIds);
      setPaths((prev) => prev.filter((p) => !deletedSet.has(p.id)));
    };

    socket.on("drawing:state", handleState);
    socket.on("drawing:started", handleStarted);
    socket.on("drawing:moved", handleMoved);
    socket.on("drawing:ended", handleEnded);
    socket.on("drawing:deleted", handleDeleted);
    socket.on("drawing:cleared", handleCleared);

    return () => {
      socket.off("drawing:state", handleState);
      socket.off("drawing:started", handleStarted);
      socket.off("drawing:moved", handleMoved);
      socket.off("drawing:ended", handleEnded);
      socket.off("drawing:deleted", handleDeleted);
      socket.off("drawing:cleared", handleCleared);
    };
  }, [enabled, profileId, socket]);

  // 드로잉 시작 전송
  const emitDrawStart = useCallback(
    (data: { pathId: string; color: string; width: number; isEraser: boolean; point: Point }) => {
      if (!sheetId || !profileId) return;
      socket.emit("drawing:start", { sheetId, profileId, ...data });
    },
    [sheetId, profileId, socket],
  );

  // 드로잉 이동 전송 (스로틀링은 호출하는 쪽에서)
  const emitDrawMove = useCallback(
    (data: { pathId: string; point: Point }) => {
      if (!sheetId) return;
      socket.emit("drawing:move", { sheetId, ...data });
    },
    [sheetId, socket],
  );

  // 획 추가 (옵티미스틱 + 서버 동기화)
  const addPath = useCallback(
    (path: DrawingPath) => {
      if (!sheetId || !profileId) return;
      setPaths((prev) => [...prev, path]);
      socket.emit("drawing:end", {
        sheetId,
        profileId,
        pathId: path.id,
        color: path.color,
        width: path.width,
        isEraser: path.isEraser,
        points: path.points,
      });
      setUndoStack((prev) => [...prev, { added: [path], deleted: [] }]);
      setRedoStack([]);
    },
    [sheetId, profileId, socket],
  );

  // 획 삭제 (옵티미스틱 + 서버 동기화)
  const deletePath = useCallback(
    (pathId: string) => {
      if (!sheetId) return;
      setPaths((prev) => {
        const deleted = prev.find((p) => p.id === pathId);
        if (deleted) {
          if (batchRef.current) {
            batchRef.current.push(deleted);
          } else {
            setUndoStack((stack) => [...stack, { added: [], deleted: [deleted] }]);
            setRedoStack([]);
          }
        }
        return prev.filter((p) => p.id !== pathId);
      });
      socket.emit("drawing:delete", { sheetId, pathId });
    },
    [sheetId, socket],
  );

  // 배치 시작 (드래그 획 지우개용)
  const startBatch = useCallback(() => {
    batchRef.current = [];
  }, []);

  // 배치 종료
  const endBatch = useCallback(() => {
    if (batchRef.current && batchRef.current.length > 0) {
      const deleted = batchRef.current;
      setUndoStack((prev) => [...prev, { added: [], deleted }]);
      setRedoStack([]);
    }
    batchRef.current = null;
  }, []);

  // 내 드로잉 전체 삭제
  const clearMyPaths = useCallback(() => {
    if (!sheetId || !profileId) return;
    setPaths((prev) => {
      const myPaths = prev.filter((p) => p.profileId === profileId);
      if (myPaths.length > 0) {
        setUndoStack((stack) => [...stack, { added: [], deleted: myPaths }]);
        setRedoStack([]);
      }
      return prev.filter((p) => p.profileId !== profileId);
    });
    socket.emit("drawing:clear", { sheetId, profileId });
  }, [sheetId, profileId, socket]);

  // Undo
  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      const rest = prev.slice(0, -1);

      setPaths((currentPaths) => {
        let next = currentPaths;
        // added를 삭제
        if (action.added.length > 0) {
          const addedIds = new Set(action.added.map((p) => p.id));
          next = next.filter((p) => !addedIds.has(p.id));
          for (const path of action.added) {
            socket.emit("drawing:delete", { sheetId, pathId: path.id });
          }
        }
        // deleted를 복원
        if (action.deleted.length > 0) {
          next = [...next, ...action.deleted];
          for (const path of action.deleted) {
            socket.emit("drawing:end", {
              sheetId,
              profileId,
              pathId: path.id,
              color: path.color,
              width: path.width,
              isEraser: path.isEraser,
              points: path.points,
            });
          }
        }
        return next;
      });

      setRedoStack((redoPrev) => [...redoPrev, action]);
      return rest;
    });
  }, [sheetId, profileId, socket]);

  // Redo
  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      const rest = prev.slice(0, -1);

      setPaths((currentPaths) => {
        let next = currentPaths;
        // added를 다시 추가
        if (action.added.length > 0) {
          next = [...next, ...action.added];
          for (const path of action.added) {
            socket.emit("drawing:end", {
              sheetId,
              profileId,
              pathId: path.id,
              color: path.color,
              width: path.width,
              isEraser: path.isEraser,
              points: path.points,
            });
          }
        }
        // deleted를 다시 삭제
        if (action.deleted.length > 0) {
          const deletedIds = new Set(action.deleted.map((p) => p.id));
          next = next.filter((p) => !deletedIds.has(p.id));
          for (const path of action.deleted) {
            socket.emit("drawing:delete", { sheetId, pathId: path.id });
          }
        }
        return next;
      });

      setUndoStack((undoPrev) => [...undoPrev, action]);
      return rest;
    });
  }, [sheetId, profileId, socket]);

  return {
    paths,
    remoteInProgress: Array.from(remoteInProgress.values()),
    emitDrawStart,
    emitDrawMove,
    addPath,
    deletePath,
    clearMyPaths,
    startBatch,
    endBatch,
    undo,
    redo,
  };
}
