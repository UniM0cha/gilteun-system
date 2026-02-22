import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  id: string;
  color: string;
  width: number;
  points: Point[];
  isEraser?: boolean;
}

export type EraserType = 'none' | 'area' | 'stroke';

interface SheetCanvasProps {
  imageUrl: string | null;
  isDrawMode: boolean;
  penColor: string;
  penWidth: number;
  eraserType: EraserType;
  eraserWidth: number;
  onDrawingChange?: (paths: DrawingPath[]) => void;
  initialPaths?: DrawingPath[];
}

export interface SheetCanvasRef {
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

const SheetCanvas = forwardRef<SheetCanvasRef, SheetCanvasProps>(({
  imageUrl,
  isDrawMode,
  penColor,
  penWidth,
  eraserType,
  eraserWidth,
  onDrawingChange,
  initialPaths = [],
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [paths, setPaths] = useState<DrawingPath[]>(initialPaths);
  const [history, setHistory] = useState<DrawingPath[][]>([initialPaths]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [deletedPathsInStroke, setDeletedPathsInStroke] = useState<Set<string>>(new Set());

  // Canvas 크기 설정 및 렌더링
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    };

    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [paths]);

  // 드로잉 캔버스 다시 그리기 (이미지는 제외, 그림만)
  const redrawCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 드로잉 경로 그리기
    paths.forEach((path) => {
      if (path.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (path.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });

    ctx.globalCompositeOperation = 'source-over';
  };

  // 현재 경로 그리기
  useEffect(() => {
    if (currentPath.length < 2) return;

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastTwoPoints = currentPath.slice(-2);

    ctx.beginPath();
    ctx.strokeStyle = eraserType === 'area' ? '#FFFFFF' : penColor;
    ctx.lineWidth = eraserType === 'area' ? eraserWidth : penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (eraserType === 'area') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.moveTo(lastTwoPoints[0].x, lastTwoPoints[0].y);
    ctx.lineTo(lastTwoPoints[1].x, lastTwoPoints[1].y);
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
  }, [currentPath, penColor, penWidth, eraserType, eraserWidth]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    let clientX: number;
    let clientY: number;

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

    return { x, y };
  };

  // 점과 선분 사이의 최소 거리 계산
  const distanceToSegment = (point: Point, p1: Point, p2: Point): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    
    if (dx === 0 && dy === 0) {
      // p1과 p2가 같은 점
      const pdx = point.x - p1.x;
      const pdy = point.y - p1.y;
      return Math.sqrt(pdx * pdx + pdy * pdy);
    }
    
    // 선분에 대한 점의 투영 비율
    const t = Math.max(0, Math.min(1, ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy)));
    
    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;
    
    const pdx = point.x - projX;
    const pdy = point.y - projY;
    
    return Math.sqrt(pdx * pdx + pdy * pdy);
  };

  // 선분이 영역 지우개에 의해 가려졌는지 확인
  const isSegmentErased = (p1: Point, p2: Point, ctx: CanvasRenderingContext2D): boolean => {
    // 선분을 여러 점으로 샘플링하여 확인 (더 촘촘하게)
    const samples = 20; // 5 → 20으로 증가
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = Math.floor(p1.x + (p2.x - p1.x) * t);
      const y = Math.floor(p1.y + (p2.y - p1.y) * t);
      
      const imageData = ctx.getImageData(x, y, 1, 1);
      const alpha = imageData.data[3];
      
      // 샘플 점이 하나라도 투명하면 이 선분은 지워진 것으로 간주
      if (alpha <= 10) {
        return true;
      }
    }
    return false;
  };

  // 클릭한 점에서 연결된 점들의 범위 찾기 (영역 지우개로 차단된 곳까지)
  const findConnectedSegment = (
    path: DrawingPath,
    clickPointIndex: number,
    ctx: CanvasRenderingContext2D
  ): { start: number; end: number } => {
    const points = path.points;
    let start = clickPointIndex;
    let end = clickPointIndex;

    // 시작점 방향으로 탐색
    for (let i = clickPointIndex - 1; i >= 0; i--) {
      if (isSegmentErased(points[i], points[i + 1], ctx)) {
        break; // 지워진 선분을 만나면 중단
      }
      start = i;
    }

    // 끝점 방향으로 탐색
    for (let i = clickPointIndex + 1; i < points.length; i++) {
      if (isSegmentErased(points[i - 1], points[i], ctx)) {
        break; // 지워진 선분을 만나면 중단
      }
      end = i;
    }

    return { start, end };
  };

  // 획 지우개: 클릭 지점 근처의 획과 클릭한 선분 찾기
  const findPathAtPoint = (
    point: Point,
    threshold: number = 20
  ): { pathIndex: number; segmentIndex: number } | null => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 클릭한 지점의 픽셀이 투명한지 확인
    const imageData = ctx.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1);
    const alpha = imageData.data[3];
    
    if (alpha <= 10) {
      return null; // 투명한 영역은 선택하지 않음
    }

    for (let i = paths.length - 1; i >= 0; i--) {
      // 이미 이번 스트로크에서 삭제된 획은 스킵
      if (deletedPathsInStroke.has(paths[i].id)) continue;
      
      const path = paths[i];
      
      // 영역 지우개 획은 선택하지 않음 (일반 펜 획만 선택)
      if (path.isEraser) continue;
      
      for (let j = 0; j < path.points.length - 1; j++) {
        const dist = distanceToSegment(point, path.points[j], path.points[j + 1]);
        
        if (dist <= threshold + path.width / 2) {
          return { pathIndex: i, segmentIndex: j };
        }
      }
    }
    
    return null;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawMode) return;

    e.preventDefault();
    const point = getCoordinates(e);
    if (!point) return;

    // 획 지우개: 드래그 시작
    if (eraserType === 'stroke') {
      setIsDrawing(true);
      setDeletedPathsInStroke(new Set());
      
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const pathInfo = findPathAtPoint(point);
      if (pathInfo) {
        const { pathIndex, segmentIndex } = pathInfo;
        const path = paths[pathIndex];
        
        // 클릭한 점에서 연결된 영역 찾기
        const { start, end } = findConnectedSegment(path, segmentIndex, ctx);
        
        // 연결된 부분만 제거하고 나머지는 새로운 path로 저장
        const newPaths = [...paths];
        
        // 원래 위치에서 제거
        newPaths.splice(pathIndex, 1);
        
        // 분할된 path들을 원래 위치에 삽입 (순서 유지)
        const splitPaths: DrawingPath[] = [];
        
        // 제거할 부분의 앞부분이 있으면 추가
        const beforePoints = path.points.slice(0, start);
        if (beforePoints.length > 1) {
          splitPaths.push({
            id: Math.random().toString(36).substr(2, 9),
            color: path.color,
            width: path.width,
            points: beforePoints,
            isEraser: false,
          });
        }
        
        // 제거할 부분의 뒷부분이 있으면 추가
        const afterPoints = path.points.slice(end + 1);
        if (afterPoints.length > 1) {
          splitPaths.push({
            id: Math.random().toString(36).substr(2, 9),
            color: path.color,
            width: path.width,
            points: afterPoints,
            isEraser: false,
          });
        }
        
        // 원래 위치에 분할된 path들 삽입
        newPaths.splice(pathIndex, 0, ...splitPaths);
        
        const newDeleted = new Set<string>();
        newDeleted.add(path.id);
        setDeletedPathsInStroke(newDeleted);
        
        setPaths(newPaths);
      }
      return;
    }

    setIsDrawing(true);
    setCurrentPath([point]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawMode) return;

    e.preventDefault();
    const point = getCoordinates(e);
    if (!point) return;

    // 획 지우개: 드래그하면서 지나가는 획의 연결된 영역만 삭제
    if (eraserType === 'stroke') {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const pathInfo = findPathAtPoint(point);
      if (pathInfo && !deletedPathsInStroke.has(paths[pathInfo.pathIndex].id)) {
        const { pathIndex, segmentIndex } = pathInfo;
        const path = paths[pathIndex];
        
        // 클릭한 점에서 연결된 영역 찾기
        const { start, end } = findConnectedSegment(path, segmentIndex, ctx);
        
        // 연결된 부분만 제거하고 나머지는 새로운 path로 저장
        const newPaths = [...paths];
        
        // 원래 위치에서 제거
        newPaths.splice(pathIndex, 1);
        
        // 분할된 path들을 원래 위치에 삽입 (순서 유지)
        const splitPaths: DrawingPath[] = [];
        
        // 제거할 부분의 앞부분이 있으면 추가
        const beforePoints = path.points.slice(0, start);
        if (beforePoints.length > 1) {
          splitPaths.push({
            id: Math.random().toString(36).substr(2, 9),
            color: path.color,
            width: path.width,
            points: beforePoints,
            isEraser: false,
          });
        }
        
        // 제거할 부분의 뒷부분이 있으면 추가
        const afterPoints = path.points.slice(end + 1);
        if (afterPoints.length > 1) {
          splitPaths.push({
            id: Math.random().toString(36).substr(2, 9),
            color: path.color,
            width: path.width,
            points: afterPoints,
            isEraser: false,
          });
        }
        
        // 원래 위치에 분할된 path들 삽입
        newPaths.splice(pathIndex, 0, ...splitPaths);
        
        const newDeleted = new Set(deletedPathsInStroke);
        newDeleted.add(path.id);
        setDeletedPathsInStroke(newDeleted);
        
        setPaths(newPaths);
      }
      return;
    }

    setCurrentPath((prev) => [...prev, point]);
  };

  const handleEnd = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    // 획 지우개: 히스토리에 저장
    if (eraserType === 'stroke' && deletedPathsInStroke.size > 0) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(paths);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      if (onDrawingChange) {
        onDrawingChange(paths);
      }
      
      setDeletedPathsInStroke(new Set());
      setCurrentPath([]);
      return;
    }

    if (currentPath.length > 1 && eraserType === 'area') {
      // 영역 지우개만 경로를 저장
      const newPath: DrawingPath = {
        id: Math.random().toString(36).substr(2, 9),
        color: penColor,
        width: eraserWidth,
        points: currentPath,
        isEraser: true,
      };

      const newPaths = [...paths, newPath];
      setPaths(newPaths);

      // 히스토리 업데이트
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newPaths);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      if (onDrawingChange) {
        onDrawingChange(newPaths);
      }
    } else if (currentPath.length > 1 && eraserType === 'none') {
      // 일반 펜
      const newPath: DrawingPath = {
        id: Math.random().toString(36).substr(2, 9),
        color: penColor,
        width: penWidth,
        points: currentPath,
        isEraser: false,
      };

      const newPaths = [...paths, newPath];
      setPaths(newPaths);

      // 히스토리 업데이트
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newPaths);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      if (onDrawingChange) {
        onDrawingChange(newPaths);
      }
    }

    setCurrentPath([]);
  };

  // 실행 취소
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPaths(history[newIndex]);
      if (onDrawingChange) {
        onDrawingChange(history[newIndex]);
      }
    }
  };

  // 다시 실행
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPaths(history[newIndex]);
      if (onDrawingChange) {
        onDrawingChange(history[newIndex]);
      }
    }
  };

  // 전체 지우기
  const clear = () => {
    const newPaths: DrawingPath[] = [];
    setPaths(newPaths);
    const newHistory = [...history, newPaths];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    if (onDrawingChange) {
      onDrawingChange(newPaths);
    }
  };

  // 부모 컴포넌트에서 사용할 수 있도록 메서드 노출
  useImperativeHandle(ref, () => ({
    undo,
    redo,
    clear,
  }), [historyIndex, history]);

  // 이미지 크기 계산
  const getImageStyle = () => {
    if (!imageUrl) return {};
    
    return {
      objectFit: 'contain' as const,
      width: '100%',
      height: '100%',
    };
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* 이미지 레이어 (배경) */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="악보"
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={getImageStyle()}
        />
      )}

      {/* 드로잉 레이어 */}
      <canvas
        ref={drawingCanvasRef}
        className={`absolute inset-0 w-full h-full ${
          isDrawMode ? (eraserType === 'stroke' ? 'cursor-pointer' : 'cursor-crosshair') : 'cursor-default'
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
});

SheetCanvas.displayName = 'SheetCanvas';

export default SheetCanvas;