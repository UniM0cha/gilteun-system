import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket, setSheetRoom } from "./useSocket";
import { queryKeys } from "@/lib/queryKeys";

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
  isHighlighter: boolean;
}

interface RemoteInProgressPath {
  pathId: string;
  profileId: string;
  color: string;
  width: number;
  isEraser: boolean;
  isHighlighter: boolean;
  points: Point[];
}

interface UndoAction {
  added: DrawingPath[];
  deleted: DrawingPath[];
}

// 스택에서 해당 id를 담은 가장 최근 added 항목 1개만 걷어낸다 — 충돌 교정/롤백된
// 낙관적 add를 회수하되, 더 깊은 항목은 정상 기록일 수 있으므로 보존
function purgeLatestAdded(stack: UndoAction[], id: string): UndoAction[] {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].added.some((p) => p.id === id)) {
      const next = [...stack];
      const updated = { ...next[i], added: next[i].added.filter((p) => p.id !== id) };
      if (updated.added.length > 0 || updated.deleted.length > 0) next[i] = updated;
      else next.splice(i, 1);
      return next;
    }
  }
  return stack;
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
  // 소켓 핸들러의 stale closure를 피하기 위한 최신 paths 미러 (읽기 전용)
  const pathsRef = useRef<DrawingPath[]>([]);
  pathsRef.current = paths;

  const socket = getSocket();
  const queryClient = useQueryClient();

  // Sheet room 입장/퇴장
  useEffect(() => {
    if (!enabled || !sheetId) return;

    if (currentSheetIdRef.current && currentSheetIdRef.current !== sheetId) {
      socket.emit("leave:sheet", { sheetId: currentSheetIdRef.current });
    }

    currentSheetIdRef.current = sheetId;
    // 새 시트 입장 시 이전 시트 stroke를 즉시 치움 — 전환 직후 잔상 방지.
    // 프리페치된 캐시가 있으면 그것으로 즉시 seed해 pop-in 제거(새 시트 id로 키잉된 데이터라 잔상 위험 없음).
    // 곧 도착하는 서버 drawing:state가 권위 데이터로 reconcile한다.
    const seeded = queryClient.getQueryData<DrawingPath[]>(queryKeys.drawings.bySheet(sheetId));
    setPaths(seeded ?? []);
    setRemoteInProgress(new Map());
    // 진행 중이던 획 지우개 배치를 닫음 — 닫지 않으면 새 시트의 첫 deletePath가 흡수됨
    batchRef.current = null;
    socket.emit("join:sheet", { sheetId });
    setSheetRoom({ sheetId });

    // 시트 전환 시 undo/redo 초기화
    setUndoStack([]);
    setRedoStack([]);

    return () => {
      if (currentSheetIdRef.current) {
        socket.emit("leave:sheet", { sheetId: currentSheetIdRef.current });
        // 떠난 시트의 drawing 캐시를 제거 — invalidate는 데이터를 남겨 getQueryData가 stale 값을
        // 그대로 반환하므로, 아예 제거해 재방문 시 prefetch가 DB에서 최신(내 편집 포함)을 다시 받게 함.
        // 이전/다음은 인접이라 항상 재프리페치되어 seed가 stale/이미 지운 stroke로 채워지지 않음.
        queryClient.removeQueries({ queryKey: queryKeys.drawings.bySheet(currentSheetIdRef.current) });
        currentSheetIdRef.current = null;
        setSheetRoom(null);
      }
    };
  }, [sheetId, enabled, socket, queryClient]);

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
      isHighlighter: boolean;
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
          isHighlighter: data.isHighlighter ?? false,
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
      isHighlighter: boolean;
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
        isHighlighter: data.isHighlighter ?? false,
      };
      // 같은 id가 이미 있으면 전부 접어 권위 row 하나만 남긴다 — 중복 도착(재연결 flush)은
      // 내용이 같아 무해하고, id 충돌 시(기존 row + 낙관적 add로 같은 id가 2개일 수 있음)
      // 서버가 보내는 DB 권위 row로 로컬(송신자 포함) 상태가 교정된다
      setPaths((prev) => {
        const idx = prev.findIndex((p) => p.id === path.id);
        if (idx === -1) return [...prev, path];
        // 첫 번째 항목 자리에 권위 row를 두고, 그 뒤의 같은 id 항목은 제거
        const next = prev.filter((p, i) => i === idx || p.id !== path.id);
        next[idx] = path;
        return next;
      });
      // 동일 내용 재전송(replay)이면 undo 기록을 건드리지 않는다 — 내 획이 네트워크
      // 재전송으로 한 번 더 도착한 경우까지 purge하면 정상 Undo가 사라진다.
      // 판정 기준은 "가장 최근 매칭"(낙관적 add는 항상 뒤에 append됨) — 첫 매칭으로
      // 비교하면 기존 DB 획과 일치해 진짜 충돌을 replay로 오판한다.
      let local: DrawingPath | undefined;
      for (let i = pathsRef.current.length - 1; i >= 0; i--) {
        if (pathsRef.current[i].id === path.id) {
          local = pathsRef.current[i];
          break;
        }
      }
      const isIdenticalReplay =
        !!local &&
        local.profileId === path.profileId &&
        local.color === path.color &&
        local.width === path.width &&
        local.isEraser === path.isEraser &&
        local.isHighlighter === path.isHighlighter &&
        local.points.length === path.points.length &&
        local.points.every((pt, i) => pt.x === path.points[i].x && pt.y === path.points[i].y);
      if (isIdenticalReplay) return;

      // 내 획은 socket.to로 에코되지 않으므로, 내 undo 스택에 있는 id로 ended가 오는
      // 경우는 id 충돌 교정뿐 — 충돌을 일으킨 낙관적 add만 걷어내 직후 Undo가
      // 같은 id의 DB 기존 획을 drawing:delete로 지우는 것을 방지한다
      setUndoStack((stack) => purgeLatestAdded(stack, path.id));
      setRedoStack((stack) => purgeLatestAdded(stack, path.id));
    };

    const handleDeleted = (data: { sheetId: string; pathId: string }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;
      setPaths((prev) => prev.filter((p) => p.id !== data.pathId));
    };

    // 서버가 저장을 거부한 내 낙관적 획 롤백 (id 충돌 등, 송신자 전용) —
    // 화면의 획과 undo/redo 기록을 함께 회수한다
    const handleRejected = (data: { sheetId: string; pathId: string }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;
      setPaths((prev) => prev.filter((p) => p.id !== data.pathId));
      setUndoStack((stack) => purgeLatestAdded(stack, data.pathId));
      setRedoStack((stack) => purgeLatestAdded(stack, data.pathId));
    };

    // 거부된 획의 피어측 정리 — started/moved로 그려지던 진행 중 획만 치운다
    // (paths/undo는 건드리지 않음: 피어의 로컬 상태는 롤백 대상이 아님)
    const handleCancelled = (data: { sheetId: string; pathId: string }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;
      setRemoteInProgress((prev) => {
        if (!prev.has(data.pathId)) return prev;
        const next = new Map(prev);
        next.delete(data.pathId);
        return next;
      });
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
    socket.on("drawing:rejected", handleRejected);
    socket.on("drawing:cancelled", handleCancelled);
    socket.on("drawing:cleared", handleCleared);

    return () => {
      socket.off("drawing:state", handleState);
      socket.off("drawing:started", handleStarted);
      socket.off("drawing:moved", handleMoved);
      socket.off("drawing:ended", handleEnded);
      socket.off("drawing:deleted", handleDeleted);
      socket.off("drawing:rejected", handleRejected);
      socket.off("drawing:cancelled", handleCancelled);
      socket.off("drawing:cleared", handleCleared);
    };
  }, [enabled, profileId, socket]);

  // 드로잉 시작 전송
  const emitDrawStart = useCallback(
    (data: {
      pathId: string;
      color: string;
      width: number;
      isEraser: boolean;
      isHighlighter: boolean;
      point: Point;
    }) => {
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

  // 진행 중 획 취소 전송 — 로컬에서 버린 획을 피어의 remoteInProgress에서도 치운다.
  // sheetId prop이 아니라 currentSheetIdRef(소켓이 실제로 join한 방)를 쓴다: 시트 전환 도중
  // 취소가 나갈 때 prop은 이미 새 시트지만 room 입장/퇴장 effect는 아직 실행 전이라,
  // 취소를 받아야 할 피어는 여전히 "이전 시트" 방에 있다. 의도된 divergence이므로 되돌리지 말 것.
  const emitDrawCancel = useCallback(
    (data: { pathId: string }) => {
      const sheetRoomId = currentSheetIdRef.current;
      if (!sheetRoomId) return;
      socket.emit("drawing:cancel", { sheetId: sheetRoomId, pathId: data.pathId });
    },
    [socket],
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
        isHighlighter: path.isHighlighter,
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
              isHighlighter: path.isHighlighter,
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
              isHighlighter: path.isHighlighter,
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

  // 매 렌더마다 새 배열을 만들지 않도록 메모이즈 — SheetCanvas의 불필요한 redraw 방지
  const visibleRemoteInProgress = useMemo(() => Array.from(remoteInProgress.values()), [remoteInProgress]);

  return {
    paths,
    remoteInProgress: visibleRemoteInProgress,
    emitDrawStart,
    emitDrawMove,
    emitDrawCancel,
    addPath,
    deletePath,
    clearMyPaths,
    startBatch,
    endBatch,
    undo,
    redo,
  };
}
