import { useEffect, useRef, useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSocket } from "./useSocket";
import { queryKeys } from "@/lib/queryKeys";
import { generateId } from "@/lib/canvas";
import {
  DrawingSession,
  sameDrawing,
  type DrawingAcknowledgement,
  type DrawingMutation,
  type DrawingSnapshotPage,
} from "@/lib/drawingSession";
import type { Sheet } from "@/types";

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
  revision: number;
}

type BulkStatus = "idle" | "loading" | "ready" | "error";
const EMPTY_PATHS: DrawingPath[] = [];
const EMPTY_REMOTE: RemoteInProgressPath[] = [];
const SNAPSHOT_TIMEOUT_MS = 10_000;
const CONNECTION_ERROR = "연결이 끊겨 그림을 불러올 수 없습니다. 연결 후 다시 시도해 주세요.";

interface UseDrawingSyncOptions {
  sheetId: string | null;
  profileId: string | null;
  worshipId: string | null;
  sheets: Sheet[];
  enabled: boolean;
  preloadEnabled?: boolean;
}

export function useDrawingSync({
  sheetId,
  profileId,
  worshipId,
  sheets,
  enabled,
  preloadEnabled = false,
}: UseDrawingSyncOptions) {
  // A new worship receives a completely new store, including pending operations.
  // Page changes keep the same store and the exact array for unchanged drawings.
  const session = useMemo(() => new DrawingSession(enabled ? worshipId : null), [worshipId, enabled]);
  const pathsBySheet = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const paths = (sheetId && pathsBySheet.get(sheetId)) || EMPTY_PATHS;
  const [remoteInProgress, setRemoteInProgress] = useState<Map<string, RemoteInProgressPath>>(new Map());
  const [bulk, setBulk] = useState<{ session: DrawingSession; status: BulkStatus }>({ session, status: "idle" });
  const bulkStatusRef = useRef<BulkStatus>("idle");
  bulkStatusRef.current = bulk.session === session ? bulk.status : "idle";
  const [failure, setFailure] = useState<{ session: DrawingSession; sheetId: string | null; message: string } | null>(
    null,
  );
  const currentSheetIdRef = useRef<string | null>(null);
  const pageRequestRef = useRef<{ id: string; reconciledThrough?: number } | null>(null);
  const subscriptionRef = useRef<{ id: string; reconciledThrough?: number } | null>(null);
  const pageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bulkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchRef = useRef<UndoAction | null>(null);
  const undoRef = useRef<UndoAction[]>([]);
  const redoRef = useRef<UndoAction[]>([]);
  const activeSessionRef = useRef(session);
  activeSessionRef.current = session;
  const optionsRef = useRef({ sheetId, worshipId, enabled, preloadEnabled, sheetIds: sheets.map((sheet) => sheet.id) });
  optionsRef.current = { sheetId, worshipId, enabled, preloadEnabled, sheetIds: sheets.map((sheet) => sheet.id) };
  const socket = getSocket();
  const queryClient = useQueryClient();
  const sheetIdsKey = JSON.stringify(sheets.map((sheet) => sheet.id));

  const clearPageTimer = useCallback(() => {
    if (pageTimerRef.current !== null) clearTimeout(pageTimerRef.current);
    pageTimerRef.current = null;
  }, []);
  const clearBulkTimer = useCallback(() => {
    if (bulkTimerRef.current !== null) clearTimeout(bulkTimerRef.current);
    bulkTimerRef.current = null;
  }, []);

  const requestPage = useCallback(
    (reconcilePending = false, forceState = false) => {
      const current = optionsRef.current;
      clearPageTimer();
      if (!current.enabled || !current.sheetId) return;
      if (!socket.connected) {
        if (!session.getSnapshot().has(current.sheetId)) {
          setFailure({ session, sheetId: current.sheetId, message: CONNECTION_ERROR });
        }
        return;
      }
      const requestId = generateId();
      const withState =
        reconcilePending ||
        forceState ||
        bulkStatusRef.current !== "ready" ||
        !session.getSnapshot().has(current.sheetId);
      pageRequestRef.current = withState
        ? { id: requestId, reconciledThrough: reconcilePending ? session.checkpoint() : undefined }
        : null;
      setFailure((previous) => (previous?.sheetId ? null : previous));
      if (withState) {
        pageTimerRef.current = setTimeout(() => {
          if (activeSessionRef.current !== session || pageRequestRef.current?.id !== requestId) return;
          pageTimerRef.current = null;
          setFailure({
            session,
            sheetId: current.sheetId,
            message: "그림을 불러오는 데 시간이 걸리고 있습니다. 다시 시도해 주세요.",
          });
        }, SNAPSHOT_TIMEOUT_MS);
      }
      socket.emit("join:sheet", { sheetId: current.sheetId, withState, ...(withState ? { requestId } : {}) });
    },
    [session, socket, clearPageTimer],
  );

  const requestAll = useCallback(
    (reconcilePending = false) => {
      const current = optionsRef.current;
      clearBulkTimer();
      if (!current.enabled || !current.worshipId || !current.preloadEnabled) return;
      if (!socket.connected) {
        if (current.sheetIds.some((id) => !session.getSnapshot().has(id))) {
          setBulk({ session, status: "error" });
          setFailure({ session, sheetId: null, message: CONNECTION_ERROR });
        }
        return;
      }
      const subscriptionId = generateId();
      subscriptionRef.current = {
        id: subscriptionId,
        reconciledThrough: reconcilePending ? session.checkpoint() : undefined,
      };
      setBulk({ session, status: "loading" });
      setFailure((previous) => (previous?.sheetId === null ? null : previous));
      bulkTimerRef.current = setTimeout(() => {
        if (activeSessionRef.current !== session || subscriptionRef.current?.id !== subscriptionId) return;
        bulkTimerRef.current = null;
        setBulk({ session, status: "error" });
        setFailure({
          session,
          sheetId: null,
          message: "예배의 그림을 불러오는 데 시간이 걸리고 있습니다. 다시 시도해 주세요.",
        });
      }, SNAPSHOT_TIMEOUT_MS);
      socket.emit("drawings:subscribe", { worshipId: current.worshipId, subscriptionId });
    },
    [session, socket, clearBulkTimer],
  );

  // Register page membership before any socket request. A missing map key means
  // unknown; an empty array means the server confirmed that page has no drawings.
  useEffect(() => {
    const ids: string[] = JSON.parse(sheetIdsKey);
    session.setSheets(enabled ? ids : []);
    for (const id of ids) {
      const cached = queryClient.getQueryData<DrawingPath[]>(queryKeys.drawings.bySheet(id));
      if (cached) session.seedPage(id, cached);
    }
  }, [session, enabled, sheetIdsKey, queryClient]);

  useEffect(() => {
    if (!enabled) return;
    // An adjacent HTTP request that finishes late can still seed an unknown page;
    // it cannot overwrite a socket snapshot or a pending local edit.
    return queryClient.getQueryCache().subscribe((event) => {
      const [prefix, id] = event.query.queryKey;
      if (prefix === "drawings" && typeof id === "string" && event.query.state.data) {
        session.seedPage(id, event.query.state.data as DrawingPath[]);
      }
    });
  }, [enabled, session, queryClient]);

  // Listeners are installed before the page-entry and whole-worship effects emit.
  useEffect(() => {
    if (!enabled || !worshipId) return;
    const handleState = (data: { sheetId: string; requestId?: string; paths: DrawingPath[] }) => {
      if (
        !pageRequestRef.current ||
        data.sheetId !== currentSheetIdRef.current ||
        data.requestId !== pageRequestRef.current.id
      )
        return;
      clearPageTimer();
      session.snapshot([data], pageRequestRef.current.reconciledThrough);
      pageRequestRef.current.reconciledThrough = undefined;
      setFailure((previous) => (previous?.sheetId === data.sheetId ? null : previous));
    };
    const handlePageError = (data: { sheetId: string; requestId?: string; error: string }) => {
      if (
        !pageRequestRef.current ||
        data.sheetId !== currentSheetIdRef.current ||
        data.requestId !== pageRequestRef.current.id
      )
        return;
      clearPageTimer();
      setFailure({ session, sheetId: data.sheetId, message: "이 페이지의 그림을 불러오지 못했습니다." });
    };
    const handleAll = (data: { worshipId: string; subscriptionId: string; sheets: DrawingSnapshotPage[] }) => {
      if (
        !subscriptionRef.current ||
        data.worshipId !== worshipId ||
        data.subscriptionId !== subscriptionRef.current.id
      )
        return;
      clearBulkTimer();
      if (data.sheets.some((page) => page.sheetId === currentSheetIdRef.current)) {
        clearPageTimer();
        pageRequestRef.current = null;
      }
      session.snapshot(data.sheets, subscriptionRef.current.reconciledThrough);
      subscriptionRef.current.reconciledThrough = undefined;
      setBulk({ session, status: "ready" });
      setFailure(null);
    };
    const handleAllError = (data: { worshipId: string; subscriptionId: string; error: string }) => {
      if (data.worshipId !== worshipId || data.subscriptionId !== subscriptionRef.current?.id) return;
      clearBulkTimer();
      setBulk({ session, status: "error" });
      setFailure({ session, sheetId: null, message: "예배의 그림을 미리 불러오지 못했습니다." });
    };
    const handleStarted = (data: Omit<RemoteInProgressPath, "points"> & { sheetId: string; point: Point }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;
      setRemoteInProgress((prev) => {
        const next = new Map(prev);
        next.set(data.pathId, { ...data, isHighlighter: data.isHighlighter ?? false, points: [data.point] });
        return next;
      });
    };
    const handleMoved = (data: { sheetId: string; pathId: string; point: Point }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;
      setRemoteInProgress((prev) => {
        const existing = prev.get(data.pathId);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(data.pathId, { ...existing, points: [...existing.points, data.point] });
        return next;
      });
    };
    const removeInProgress = (data: { sheetId: string; pathId: string }) => {
      if (data.sheetId !== currentSheetIdRef.current) return;
      setRemoteInProgress((prev) => {
        if (!prev.has(data.pathId)) return prev;
        const next = new Map(prev);
        next.delete(data.pathId);
        return next;
      });
    };
    const handleEnded = (data: DrawingPath & { pathId: string }) => {
      if (!session.hasSheet(data.sheetId)) return;
      removeInProgress(data);
      const path = { ...data, id: data.id || data.pathId, isHighlighter: data.isHighlighter ?? false };
      session.remote(data.sheetId, { kind: "add", path });
      // Only an operation's ack can settle its optimistic edit. A collision echo
      // can precede a later undo/redo using the same path ID.
    };
    const handleDeleted = (data: { sheetId: string; pathId: string }) => {
      session.remote(data.sheetId, { kind: "delete", pathIds: [data.pathId] });
    };
    const handleRejected = (data: { sheetId: string; pathId: string }) => {
      // Legacy rejection notifications identify a path, not an operation. Its
      // ack performs the rollback without discarding a later add of the same ID.
      removeInProgress(data);
    };
    const handleCleared = (data: { sheetId: string; deletedPathIds: string[] }) => {
      session.remote(data.sheetId, { kind: "delete", pathIds: data.deletedPathIds });
    };
    const handleDisconnect = () => {
      clearPageTimer();
      clearBulkTimer();
      pageRequestRef.current = null;
      subscriptionRef.current = null;
      setRemoteInProgress(new Map());
      const current = optionsRef.current;
      if (current.preloadEnabled && current.sheetIds.some((id) => !session.getSnapshot().has(id))) {
        setBulk({ session, status: "error" });
        setFailure({ session, sheetId: null, message: CONNECTION_ERROR });
      } else if (current.sheetId && !session.getSnapshot().has(current.sheetId)) {
        setFailure({ session, sheetId: current.sheetId, message: CONNECTION_ERROR });
      }
    };
    const handleConnect = () => {
      // Socket.IO flushes its sendBuffer before firing connect. Request a fresh
      // snapshot after that queue; do not introduce a second mutation retry queue.
      requestPage(true);
      requestAll(true);
    };
    socket.on("drawing:state", handleState);
    socket.on("drawing:error", handlePageError);
    socket.on("drawings:state", handleAll);
    socket.on("drawings:error", handleAllError);
    socket.on("drawing:started", handleStarted);
    socket.on("drawing:moved", handleMoved);
    socket.on("drawing:ended", handleEnded);
    socket.on("drawing:deleted", handleDeleted);
    socket.on("drawing:rejected", handleRejected);
    socket.on("drawing:cancelled", removeInProgress);
    socket.on("drawing:cleared", handleCleared);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleConnect);
    return () => {
      socket.off("drawing:state", handleState);
      socket.off("drawing:error", handlePageError);
      socket.off("drawings:state", handleAll);
      socket.off("drawings:error", handleAllError);
      socket.off("drawing:started", handleStarted);
      socket.off("drawing:moved", handleMoved);
      socket.off("drawing:ended", handleEnded);
      socket.off("drawing:deleted", handleDeleted);
      socket.off("drawing:rejected", handleRejected);
      socket.off("drawing:cancelled", removeInProgress);
      socket.off("drawing:cleared", handleCleared);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleConnect);
    };
  }, [enabled, worshipId, session, socket, requestPage, requestAll, clearPageTimer, clearBulkTimer]);

  useEffect(() => {
    if (!enabled || !sheetId) return;
    currentSheetIdRef.current = sheetId;
    setRemoteInProgress(new Map());
    batchRef.current = null;
    undoRef.current = [];
    redoRef.current = [];
    requestPage();
    return () => {
      clearPageTimer();
      socket.emit("leave:sheet", { sheetId });
      currentSheetIdRef.current = null;
      pageRequestRef.current = null;
      // Keep both the page's vectors and its rendered canvas when leaving a page.
    };
  }, [sheetId, enabled, session, socket, requestPage, clearPageTimer]);

  useEffect(() => {
    if (!enabled || !worshipId || !preloadEnabled) return;
    requestAll();
    return clearBulkTimer;
  }, [enabled, worshipId, preloadEnabled, sheetIdsKey, requestAll, clearBulkTimer]);

  useEffect(() => {
    return () => {
      clearPageTimer();
      clearBulkTimer();
      if (worshipId && subscriptionRef.current) {
        socket.emit("drawings:unsubscribe", { worshipId, subscriptionId: subscriptionRef.current.id });
      }
      subscriptionRef.current = null;
      queryClient.removeQueries({ queryKey: queryKeys.drawings.all });
    };
  }, [session, worshipId, queryClient, socket, clearPageTimer, clearBulkTimer]);

  const retryLoad = useCallback(() => {
    requestPage(false, true);
    requestAll();
  }, [requestPage, requestAll]);

  const sendChange = useCallback(
    (targetSheet: string, change: DrawingMutation, action: UndoAction) => {
      if (!enabled || !profileId) return;
      if (change.kind === "add" && change.path.profileId !== profileId) {
        change = { kind: "add", path: { ...change.path, profileId } };
      }
      const id = session.mutate(targetSheet, change);
      if (id === null) return;
      const revision = action.revision;
      const removeFailedHistory = () => {
        if (targetSheet !== currentSheetIdRef.current || action.revision !== revision) return;
        const ids = new Set(
          change.kind === "add"
            ? [change.path.id]
            : change.kind === "delete"
              ? change.pathIds
              : action.deleted.map((path) => path.id),
        );
        action.added = action.added.filter((path) => !ids.has(path.id));
        action.deleted = action.deleted.filter((path) => !ids.has(path.id));
        // Preserve newer transactions and successful paths from a partially failed
        // eraser batch. An ack from an earlier undo/redo attempt changes neither.
        const hasPaths = (item: UndoAction) => item.added.length > 0 || item.deleted.length > 0;
        undoRef.current = undoRef.current.filter(hasPaths);
        redoRef.current = redoRef.current.filter(hasPaths);
      };
      const acknowledge = (ack: DrawingAcknowledgement) => {
        if (activeSessionRef.current !== session || ack.sheetId !== targetSheet) return;
        session.acknowledge(id, ack);
        if (!ack.ok) {
          removeFailedHistory();
          toast.error("그림 변경을 저장하지 못해 이전 상태로 되돌렸습니다.");
        } else if (change.kind === "add" && ack.path && !sameDrawing(change.path, ack.path)) {
          removeFailedHistory();
        }
      };
      if (change.kind === "add") {
        const path = change.path;
        socket.emit("drawing:end", { ...path, pathId: path.id, sheetId: targetSheet, profileId }, acknowledge);
      } else if (change.kind === "delete") {
        socket.emit("drawing:delete", { sheetId: targetSheet, pathId: change.pathIds[0] }, acknowledge);
      } else {
        socket.emit("drawing:clear", { sheetId: targetSheet, profileId: change.profileId }, acknowledge);
      }
    },
    [enabled, profileId, session, socket],
  );

  const emitDrawStart = useCallback(
    (data: {
      pathId: string;
      color: string;
      width: number;
      isEraser: boolean;
      isHighlighter: boolean;
      point: Point;
    }) => {
      if (!enabled || !sheetId || !profileId) return;
      socket.emit("drawing:start", { sheetId, profileId, ...data });
    },
    [enabled, sheetId, profileId, socket],
  );
  const emitDrawMove = useCallback(
    (data: { pathId: string; point: Point }) => {
      if (enabled && sheetId) socket.emit("drawing:move", { sheetId, ...data });
    },
    [enabled, sheetId, socket],
  );
  const emitDrawCancel = useCallback(
    (data: { pathId: string }) => {
      // The page prop may have changed before its room effect. Cancel the stroke
      // in the room that actually owned it, not the incoming page.
      if (currentSheetIdRef.current) socket.emit("drawing:cancel", { sheetId: currentSheetIdRef.current, ...data });
    },
    [socket],
  );
  const addPath = useCallback(
    (path: DrawingPath) => {
      if (!sheetId || !profileId || path.sheetId !== sheetId) return;
      const action = { added: [path], deleted: [], revision: 0 };
      undoRef.current.push(action);
      redoRef.current = [];
      sendChange(sheetId, { kind: "add", path }, action);
    },
    [sheetId, profileId, sendChange],
  );
  const deletePath = useCallback(
    (pathId: string) => {
      if (!sheetId) return;
      const deleted = session
        .getSnapshot()
        .get(sheetId)
        ?.find((path) => path.id === pathId);
      if (!deleted) return;
      const action = batchRef.current ?? { added: [], deleted: [], revision: 0 };
      action.deleted.push(deleted);
      if (!batchRef.current) {
        undoRef.current.push(action);
        redoRef.current = [];
      }
      sendChange(sheetId, { kind: "delete", pathIds: [pathId] }, action);
    },
    [sheetId, session, sendChange],
  );
  const startBatch = useCallback(() => {
    batchRef.current = { added: [], deleted: [], revision: 0 };
  }, []);
  const endBatch = useCallback(() => {
    if (batchRef.current?.deleted.length) {
      undoRef.current.push(batchRef.current);
      redoRef.current = [];
    }
    batchRef.current = null;
  }, []);
  const clearMyPaths = useCallback(() => {
    if (!sheetId || !profileId) return;
    const mine = (session.getSnapshot().get(sheetId) ?? []).filter((path) => path.profileId === profileId);
    const action = { added: [], deleted: mine, revision: 0 };
    if (mine.length) {
      undoRef.current.push(action);
      redoRef.current = [];
    }
    sendChange(sheetId, { kind: "clear", profileId }, action);
  }, [sheetId, profileId, session, sendChange]);
  const undo = useCallback(() => {
    if (!sheetId || !profileId) return;
    const action = undoRef.current.pop();
    if (!action) return;
    action.revision++;
    redoRef.current.push(action);
    for (const path of action.added) sendChange(sheetId, { kind: "delete", pathIds: [path.id] }, action);
    for (const path of action.deleted) sendChange(sheetId, { kind: "add", path }, action);
  }, [sheetId, profileId, sendChange]);
  const redo = useCallback(() => {
    if (!sheetId || !profileId) return;
    const action = redoRef.current.pop();
    if (!action) return;
    action.revision++;
    undoRef.current.push(action);
    for (const path of action.added) sendChange(sheetId, { kind: "add", path }, action);
    for (const path of action.deleted) sendChange(sheetId, { kind: "delete", pathIds: [path.id] }, action);
  }, [sheetId, profileId, sendChange]);

  const visibleRemoteInProgress = useMemo(() => Array.from(remoteInProgress.values()), [remoteInProgress]);
  return {
    paths,
    pathsBySheet,
    bulkStatus: bulk.session === session ? bulk.status : "idle",
    loadError:
      failure?.session === session && (!failure.sheetId || failure.sheetId === sheetId) ? failure.message : null,
    retryLoad,
    remoteInProgress: currentSheetIdRef.current === sheetId ? visibleRemoteInProgress : EMPTY_REMOTE,
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
