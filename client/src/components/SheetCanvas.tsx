import { useEffect, useRef, useCallback } from "react";
import type { DrawingPath, Point } from "@/hooks/useDrawingSync";

export type EraserType = "none" | "area" | "stroke";

interface RemoteInProgressPath {
  pathId: string;
  profileId: string;
  color: string;
  width: number;
  isEraser: boolean;
  points: Point[];
}

interface SheetCanvasProps {
  imageUrl: string | null;
  isDrawMode: boolean;
  penColor: string;
  penWidth: number;
  eraserType: EraserType;
  eraserWidth: number;
  paths: DrawingPath[];
  remoteInProgress: RemoteInProgressPath[];
  onDrawStart?: (data: { pathId: string; color: string; width: number; isEraser: boolean; point: Point }) => void;
  onDrawMove?: (data: { pathId: string; point: Point }) => void;
  onPathAdd?: (path: DrawingPath) => void;
  onPathDelete?: (pathId: string) => void;
  onBatchStart?: () => void;
  onBatchEnd?: () => void;
  profileId: string;
}

// 정규화 좌표 → 화면 좌표
function denormalizePoint(p: Point, w: number, h: number): { x: number; y: number } {
  return { x: p.x * w, y: p.y * h };
}

// 화면 좌표 → 정규화 좌표
function normalizePoint(x: number, y: number, w: number, h: number): Point {
  return { x: x / w, y: y / h };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export default function SheetCanvas({
  imageUrl,
  isDrawMode,
  penColor,
  penWidth,
  eraserType,
  eraserWidth,
  paths,
  remoteInProgress,
  onDrawStart,
  onDrawMove,
  onPathAdd,
  onPathDelete,
  onBatchStart,
  onBatchEnd,
  profileId,
}: SheetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<Point[]>([]);
  const currentPathIdRef = useRef<string>("");
  const drawingPointerIdRef = useRef<number | null>(null);

  const lastMoveTimeRef = useRef(0);
  const redrawCanvasRef = useRef<() => void>(() => {});
  const rafIdRef = useRef(0);
  const erasedPathIdsRef = useRef<Set<string>>(new Set());
  const activePointersRef = useRef<Set<number>>(new Set());

  // props를 ref로 유지 (native event listener에서 최신 값 참조용)
  const isDrawModeRef = useRef(isDrawMode);
  isDrawModeRef.current = isDrawMode;

  // 현재 paths를 ref로 유지 (findPathAtPoint에서 최신 값 참조용)
  const pathsRef = useRef(paths);
  pathsRef.current = paths;

  // Canvas 크기 설정
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      // canvas.width/height 재설정 시 캔버스 자동 클리어됨 → 다시 그리기
      redrawCanvasRef.current();
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // iOS 돋보기 방지 + 부모 더블탭 감지 차단 — native listener (React synthetic보다 먼저 실행)
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const handler = (e: TouchEvent) => {
      if (isDrawModeRef.current) {
        e.preventDefault();
        // 단일 터치만 전파 차단 — 2+ 터치는 부모 핀치줌에 전달
        if (e.touches.length <= 1) {
          e.stopPropagation();
        }
      }
    };
    canvas.addEventListener("touchstart", handler, { passive: false });
    canvas.addEventListener("touchmove", handler, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", handler);
      canvas.removeEventListener("touchmove", handler);
    };
  }, []);

  // 전체 다시 그리기
  const redrawCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { desynchronized: true });
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 저장된 paths 렌더링
    for (const path of paths) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width * w; // 정규화된 굵기 복원
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = path.isEraser ? "destination-out" : "source-over";

      const p0 = denormalizePoint(path.points[0], w, h);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < path.points.length; i++) {
        const p = denormalizePoint(path.points[i], w, h);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // 원격 진행 중 paths 렌더링
    for (const rip of remoteInProgress) {
      if (rip.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = rip.isEraser ? "#FFFFFF" : rip.color;
      ctx.lineWidth = rip.width * w;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = rip.isEraser ? "destination-out" : "source-over";

      const p0 = denormalizePoint(rip.points[0], w, h);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < rip.points.length; i++) {
        const p = denormalizePoint(rip.points[i], w, h);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // 현재 그리고 있는 path (ref에서 읽음 — React 렌더 없이 갱신)
    const curPath = currentPathRef.current;
    if (curPath.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = eraserType === "area" ? "#FFFFFF" : penColor;
      ctx.lineWidth = ((eraserType === "area" ? eraserWidth : penWidth) / w) * w; // 화면 기준
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = eraserType === "area" ? "destination-out" : "source-over";

      const p0 = denormalizePoint(curPath[0], w, h);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < curPath.length; i++) {
        const p = denormalizePoint(curPath[i], w, h);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
  }, [paths, remoteInProgress, penColor, penWidth, eraserType, eraserWidth]);

  // redraw ref 갱신 (ResizeObserver + rAF에서 사용)
  redrawCanvasRef.current = redrawCanvas;

  // rAF 기반 리드로우 요청 (동일 프레임 내 여러 호출 → 1회만 실행)
  const requestRedraw = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => redrawCanvasRef.current());
  }, []);

  // 확정 paths / remoteInProgress / 도구 설정 변경 시 리드로우
  useEffect(() => {
    requestRedraw();
  }, [redrawCanvas, requestRedraw]);

  // 포인터 좌표 → 정규화 좌표
  const getPointerCoords = (e: PointerEvent | React.PointerEvent): Point | null => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // rect.width/height를 사용하여 CSS transform(줌) 자동 보정
    return normalizePoint(x, y, rect.width, rect.height);
  };

  // 획 지우개: 클릭 지점 근처의 path 찾기
  const findPathAtPoint = useCallback(
    (point: Point): string | null => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return null;
      const w = canvas.width;
      const h = canvas.height;

      const screenPoint = denormalizePoint(point, w, h);
      const threshold = 20;

      const currentPaths = pathsRef.current;
      for (let i = currentPaths.length - 1; i >= 0; i--) {
        const path = currentPaths[i];
        if (path.isEraser) continue;

        for (let j = 0; j < path.points.length - 1; j++) {
          const p1 = denormalizePoint(path.points[j], w, h);
          const p2 = denormalizePoint(path.points[j + 1], w, h);
          const dist = distanceToSegment(screenPoint, p1, p2);
          if (dist <= threshold + (path.width * w) / 2) {
            return path.id;
          }
        }
      }
      return null;
    },
    [], // pathsRef로 참조하므로 의존성 불필요
  );

  const distanceToSegment = (
    point: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
  ): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    if (dx === 0 && dy === 0) {
      const pdx = point.x - p1.x;
      const pdy = point.y - p1.y;
      return Math.sqrt(pdx * pdx + pdy * pdy);
    }
    const t = Math.max(0, Math.min(1, ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy)));
    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;
    const pdx = point.x - projX;
    const pdy = point.y - projY;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  };

  // 진행 중인 그리기 취소
  const cancelDrawing = () => {
    if (!isDrawingRef.current) return;

    if (eraserType === "stroke") {
      onBatchEnd?.();
      erasedPathIdsRef.current = new Set();
    }

    isDrawingRef.current = false;
    drawingPointerIdRef.current = null;
    currentPathRef.current = [];
    requestRedraw();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isDrawMode) return;

    activePointersRef.current.add(e.pointerId);

    // 2+ 포인터 → 그리기 취소, 부모 핀치줌으로 위임
    if (activePointersRef.current.size >= 2) {
      cancelDrawing();
      return;
    }

    e.stopPropagation();
    const point = getPointerCoords(e);
    if (!point) return;

    // 포인터 캡처 — 요소 밖 드래그에도 이벤트 수신
    drawingCanvasRef.current?.setPointerCapture(e.pointerId);
    drawingPointerIdRef.current = e.pointerId;

    if (eraserType === "stroke") {
      isDrawingRef.current = true;
      erasedPathIdsRef.current = new Set();
      onBatchStart?.();
      const pathId = findPathAtPoint(point);
      if (pathId) {
        erasedPathIdsRef.current.add(pathId);
        onPathDelete?.(pathId);
      }
      return;
    }

    const pathId = generateId();
    currentPathIdRef.current = pathId;
    isDrawingRef.current = true;
    currentPathRef.current = [point];
    requestRedraw();

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const normalizedWidth = eraserType === "area" ? eraserWidth / canvas.width : penWidth / canvas.width;

    onDrawStart?.({
      pathId,
      color: eraserType === "area" ? "#FFFFFF" : penColor,
      width: normalizedWidth,
      isEraser: eraserType === "area",
      point,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current || !isDrawMode) return;
    // 그리기 중인 포인터가 아니면 무시
    if (e.pointerId !== drawingPointerIdRef.current) return;

    e.stopPropagation();
    const point = getPointerCoords(e);
    if (!point) return;

    // 드래그 획 지우개: 연속으로 path 삭제
    if (eraserType === "stroke") {
      const pathId = findPathAtPoint(point);
      if (pathId && !erasedPathIdsRef.current.has(pathId)) {
        erasedPathIdsRef.current.add(pathId);
        onPathDelete?.(pathId);
      }
      return;
    }

    // Coalesced events — Apple Pencil ~240Hz 입력 복원
    const coalesced = e.nativeEvent.getCoalescedEvents?.();
    if (coalesced && coalesced.length > 1) {
      const canvas = drawingCanvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        for (const ce of coalesced) {
          const cp = normalizePoint(ce.clientX - rect.left, ce.clientY - rect.top, rect.width, rect.height);
          currentPathRef.current.push(cp);
        }
      }
    } else {
      currentPathRef.current.push(point);
    }
    requestRedraw();

    // 스로틀링: 16ms (60fps) — 소켓 전송용
    const now = Date.now();
    if (now - lastMoveTimeRef.current >= 16) {
      lastMoveTimeRef.current = now;
      onDrawMove?.({ pathId: currentPathIdRef.current, point });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);

    // 그리기 중인 포인터가 아니면 무시
    if (e.pointerId !== drawingPointerIdRef.current) return;
    if (!isDrawingRef.current) return;

    // 드래그 획 지우개: 배치 종료
    if (eraserType === "stroke") {
      onBatchEnd?.();
      erasedPathIdsRef.current = new Set();
      isDrawingRef.current = false;
      drawingPointerIdRef.current = null;
      return;
    }

    isDrawingRef.current = false;
    drawingPointerIdRef.current = null;

    if (currentPathRef.current.length > 1) {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;
      const normalizedWidth = eraserType === "area" ? eraserWidth / canvas.width : penWidth / canvas.width;

      const newPath: DrawingPath = {
        id: currentPathIdRef.current,
        sheetId: "",
        profileId,
        color: eraserType === "area" ? "#FFFFFF" : penColor,
        width: normalizedWidth,
        points: [...currentPathRef.current],
        isEraser: eraserType === "area",
      };

      onPathAdd?.(newPath);
    }

    currentPathRef.current = [];
    requestRedraw();
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {imageUrl && (
        <img src={imageUrl} alt="악보" className="absolute inset-0 w-full h-full pointer-events-none object-contain" />
      )}

      <canvas
        ref={drawingCanvasRef}
        className={`absolute inset-0 w-full h-full ${
          isDrawMode ? (eraserType === "stroke" ? "cursor-pointer" : "cursor-crosshair") : "cursor-default"
        }`}
        style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-amber-50 to-orange-50 pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-xl text-slate-500">악보를 업로드하세요</p>
          </div>
        </div>
      )}
    </div>
  );
}
