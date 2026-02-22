import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import type { DrawingPath, Point } from '@/hooks/useDrawingSync';

export type EraserType = 'none' | 'area' | 'stroke';

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
  remotePaths: DrawingPath[];
  remoteInProgress: RemoteInProgressPath[];
  onDrawStart?: (data: {
    pathId: string;
    color: string;
    width: number;
    isEraser: boolean;
    point: Point;
  }) => void;
  onDrawMove?: (data: { pathId: string; point: Point }) => void;
  onDrawEnd?: (data: {
    pathId: string;
    color: string;
    width: number;
    isEraser: boolean;
    points: Point[];
  }) => void;
  onDrawDelete?: (pathId: string) => void;
  onDrawClear?: () => void;
  profileId: string;
}

export interface SheetCanvasRef {
  undo: () => void;
  redo: () => void;
  clear: () => void;
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

const SheetCanvas = forwardRef<SheetCanvasRef, SheetCanvasProps>(
  (
    {
      imageUrl,
      isDrawMode,
      penColor,
      penWidth,
      eraserType,
      eraserWidth,
      remotePaths,
      remoteInProgress,
      onDrawStart,
      onDrawMove,
      onDrawEnd,
      onDrawDelete,
      onDrawClear,
      profileId,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const currentPathIdRef = useRef<string>('');

    // 로컬 paths (내가 그린 것) - 정규화 좌표
    const [localPaths, setLocalPaths] = useState<DrawingPath[]>([]);
    const [history, setHistory] = useState<DrawingPath[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const lastMoveTimeRef = useRef(0);
    const redrawCanvasRef = useRef<() => void>(() => {});
    const erasedPathIdsRef = useRef<Set<string>>(new Set());

    // 모든 paths 합치기 (remote + local)
    const allPaths = [...remotePaths, ...localPaths];

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

    // 전체 다시 그리기
    const redrawCanvas = useCallback(() => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // 저장된 paths 렌더링
      for (const path of allPaths) {
        if (path.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width * w; // 정규화된 굵기 복원
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = path.isEraser ? 'destination-out' : 'source-over';

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
        ctx.strokeStyle = rip.isEraser ? '#FFFFFF' : rip.color;
        ctx.lineWidth = rip.width * w;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = rip.isEraser ? 'destination-out' : 'source-over';

        const p0 = denormalizePoint(rip.points[0], w, h);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < rip.points.length; i++) {
          const p = denormalizePoint(rip.points[i], w, h);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // 현재 그리고 있는 path
      if (currentPath.length >= 2) {
        ctx.beginPath();
        ctx.strokeStyle = eraserType === 'area' ? '#FFFFFF' : penColor;
        ctx.lineWidth = (eraserType === 'area' ? eraserWidth : penWidth) / w * w; // 화면 기준
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = eraserType === 'area' ? 'destination-out' : 'source-over';

        // currentPath는 이미 정규화된 좌표
        const p0 = denormalizePoint(currentPath[0], w, h);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < currentPath.length; i++) {
          const p = denormalizePoint(currentPath[i], w, h);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
    }, [allPaths, remoteInProgress, currentPath, penColor, penWidth, eraserType, eraserWidth]);

    // redraw ref 갱신 (ResizeObserver에서 사용)
    redrawCanvasRef.current = redrawCanvas;

    // 변경 시 리드로우
    useEffect(() => {
      redrawCanvas();
    }, [redrawCanvas]);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point | null => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // rect.width/height를 사용하여 CSS transform(줌) 자동 보정
      return normalizePoint(x, y, rect.width, rect.height);
    };

    // 획 지우개: 클릭 지점 근처의 path 찾기
    const findPathAtPoint = (point: Point): string | null => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return null;
      const w = canvas.width;
      const h = canvas.height;

      const screenPoint = denormalizePoint(point, w, h);
      const threshold = 20;

      // 모든 paths에서 (local + remote) 뒤에서부터 검색
      for (let i = allPaths.length - 1; i >= 0; i--) {
        const path = allPaths[i];
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
    };

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
      const t = Math.max(
        0,
        Math.min(
          1,
          ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy),
        ),
      );
      const projX = p1.x + t * dx;
      const projY = p1.y + t * dy;
      const pdx = point.x - projX;
      const pdy = point.y - projY;
      return Math.sqrt(pdx * pdx + pdy * pdy);
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawMode) return;
      // 2-finger 이상 → 부모의 핀치 핸들러로 위임
      if ('touches' in e && e.touches.length >= 2) return;
      e.preventDefault();
      const point = getCoordinates(e);
      if (!point) return;

      e.stopPropagation();

      if (eraserType === 'stroke') {
        setIsDrawing(true);
        erasedPathIdsRef.current = new Set();
        const pathId = findPathAtPoint(point);
        if (pathId) {
          erasedPathIdsRef.current.add(pathId);
          setLocalPaths((prev) => prev.filter((p) => p.id !== pathId));
          onDrawDelete?.(pathId);
        }
        return;
      }

      const pathId = generateId();
      currentPathIdRef.current = pathId;
      setIsDrawing(true);
      setCurrentPath([point]);

      const canvas = drawingCanvasRef.current;
      if (!canvas) return;
      const normalizedWidth =
        eraserType === 'area' ? eraserWidth / canvas.width : penWidth / canvas.width;

      onDrawStart?.({
        pathId,
        color: eraserType === 'area' ? '#FFFFFF' : penColor,
        width: normalizedWidth,
        isEraser: eraserType === 'area',
        point,
      });
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !isDrawMode) return;
      // 2-finger 시작 시 진행 중인 그리기 취소
      if ('touches' in e && e.touches.length >= 2) {
        handleEnd();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const point = getCoordinates(e);
      if (!point) return;

      // 드래그 획 지우개: 연속으로 path 삭제
      if (eraserType === 'stroke') {
        const pathId = findPathAtPoint(point);
        if (pathId && !erasedPathIdsRef.current.has(pathId)) {
          erasedPathIdsRef.current.add(pathId);
          setLocalPaths((prev) => prev.filter((p) => p.id !== pathId));
          onDrawDelete?.(pathId);
        }
        return;
      }

      setCurrentPath((prev) => [...prev, point]);

      // 스로틀링: 16ms (60fps)
      const now = Date.now();
      if (now - lastMoveTimeRef.current >= 16) {
        lastMoveTimeRef.current = now;
        onDrawMove?.({ pathId: currentPathIdRef.current, point });
      }
    };

    const handleEnd = () => {
      if (!isDrawing) return;

      // 드래그 획 지우개: 삭제 결과를 히스토리에 한 번으로 기록
      if (eraserType === 'stroke') {
        if (erasedPathIdsRef.current.size > 0) {
          setLocalPaths((prev) => {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(prev);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            return prev;
          });
        }
        erasedPathIdsRef.current = new Set();
        setIsDrawing(false);
        return;
      }

      setIsDrawing(false);

      if (currentPath.length > 1) {
        const canvas = drawingCanvasRef.current;
        if (!canvas) return;
        const normalizedWidth =
          eraserType === 'area' ? eraserWidth / canvas.width : penWidth / canvas.width;

        const newPath: DrawingPath = {
          id: currentPathIdRef.current,
          sheetId: '',
          profileId,
          color: eraserType === 'area' ? '#FFFFFF' : penColor,
          width: normalizedWidth,
          points: currentPath,
          isEraser: eraserType === 'area',
        };

        setLocalPaths((prev) => {
          const next = [...prev, newPath];
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(next);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
          return next;
        });

        onDrawEnd?.({
          pathId: currentPathIdRef.current,
          color: newPath.color,
          width: newPath.width,
          isEraser: newPath.isEraser,
          points: currentPath,
        });
      }

      setCurrentPath([]);
    };

    const undo = () => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        const prevPaths = history[newIndex];
        const currentPaths = localPaths;

        // 현재와 이전의 차이 계산
        const prevIds = new Set(prevPaths.map((p) => p.id));
        const currentIds = new Set(currentPaths.map((p) => p.id));

        // 삭제된 path → 서버에서도 삭제
        for (const id of currentIds) {
          if (!prevIds.has(id)) {
            onDrawDelete?.(id);
          }
        }
        // 복원된 path → 서버에 다시 추가
        for (const path of prevPaths) {
          if (!currentIds.has(path.id)) {
            onDrawEnd?.({
              pathId: path.id,
              color: path.color,
              width: path.width,
              isEraser: path.isEraser,
              points: path.points,
            });
          }
        }

        setHistoryIndex(newIndex);
        setLocalPaths(prevPaths);
      }
    };

    const redo = () => {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        const nextPaths = history[newIndex];
        const currentPaths = localPaths;

        const nextIds = new Set(nextPaths.map((p) => p.id));
        const currentIds = new Set(currentPaths.map((p) => p.id));

        for (const id of currentIds) {
          if (!nextIds.has(id)) {
            onDrawDelete?.(id);
          }
        }
        for (const path of nextPaths) {
          if (!currentIds.has(path.id)) {
            onDrawEnd?.({
              pathId: path.id,
              color: path.color,
              width: path.width,
              isEraser: path.isEraser,
              points: path.points,
            });
          }
        }

        setHistoryIndex(newIndex);
        setLocalPaths(nextPaths);
      }
    };

    const clear = () => {
      setLocalPaths([]);
      const newHistory = [...history, []];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      onDrawClear?.();
    };

    useImperativeHandle(ref, () => ({ undo, redo, clear }), [historyIndex, history, localPaths]);

    return (
      <div ref={containerRef} className="relative w-full h-full">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="악보"
            className="absolute inset-0 w-full h-full pointer-events-none object-contain"
          />
        )}

        <canvas
          ref={drawingCanvasRef}
          className={`absolute inset-0 w-full h-full ${
            isDrawMode
              ? eraserType === 'stroke'
                ? 'cursor-pointer'
                : 'cursor-crosshair'
              : 'cursor-default'
          }`}
          style={{ touchAction: 'none' }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />

        {!imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 pointer-events-none">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-xl text-slate-500">악보를 업로드하세요</p>
            </div>
          </div>
        )}
      </div>
    );
  },
);

SheetCanvas.displayName = 'SheetCanvas';

export default SheetCanvas;
