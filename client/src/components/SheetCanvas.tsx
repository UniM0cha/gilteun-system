import { useEffect, useLayoutEffect, useRef, useCallback, useState } from "react";
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
  sheetId: string;
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

interface ContentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FALLBACK_SHEET_ASPECT = 3 / 4;
const EMPTY_RECT: ContentRect = { x: 0, y: 0, width: 0, height: 0 };

// 정규화 좌표 → 화면 좌표
function denormalizePoint(p: Point, rect: ContentRect): { x: number; y: number } {
  return { x: rect.x + p.x * rect.width, y: rect.y + p.y * rect.height };
}

// 화면 좌표 → 정규화 좌표
function normalizePoint(x: number, y: number, rect: ContentRect): Point {
  return { x: (x - rect.x) / rect.width, y: (y - rect.y) / rect.height };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getContainedRect(containerWidth: number, containerHeight: number, aspect: number): ContentRect {
  if (containerWidth <= 0 || containerHeight <= 0 || aspect <= 0) return EMPTY_RECT;

  const containerAspect = containerWidth / containerHeight;
  if (containerAspect > aspect) {
    const width = containerHeight * aspect;
    return { x: (containerWidth - width) / 2, y: 0, width, height: containerHeight };
  }

  const height = containerWidth / aspect;
  return { x: 0, y: (containerHeight - height) / 2, width: containerWidth, height };
}

// 그리기/정규화의 기준이 되는 CSS-space content rect. 좌표·굵기 계산은 모두 CSS px 기준이어야 하므로
// backing store 픽셀(canvas.width, DPR배)이 아닌 레이아웃 크기(offsetWidth/Height)를 단일 기준으로 고정한다.
// 한 call site라도 canvas.width로 되돌아가면 DPR배 오차가 나므로 helper로 묶어 불변식을 강제한다.
function getCanvasContentRect(canvas: HTMLCanvasElement, imageAspect: number | null): ContentRect {
  return getContainedRect(canvas.offsetWidth, canvas.offsetHeight, imageAspect ?? FALLBACK_SHEET_ASPECT);
}

// backing store를 CSS 레이아웃 크기 × DPR로 동기화 (실제로 다를 때만 — 재설정 시 canvas가 클리어됨).
// 사용한 dpr을 반환 — 호출부가 ctx.setTransform(dpr,…)로 좌표계를 CSS px로 통일한다.
// ResizeObserver 경로와 redraw 경로가 같은 계산을 쓰도록 한곳에 모은다.
function syncCanvasBackingStore(canvas: HTMLCanvasElement): number {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight;
  const bufW = Math.round(cssW * dpr);
  const bufH = Math.round(cssH * dpr);
  if (cssW > 0 && cssH > 0 && (canvas.width !== bufW || canvas.height !== bufH)) {
    canvas.width = bufW;
    canvas.height = bufH;
  }
  return dpr;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export default function SheetCanvas({
  sheetId,
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
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);
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

  // 이미지가 바뀌면 종횡비 재계산. onLoad가 채우지만, 브라우저 캐시된 이미지는 onLoad가
  // 발화하지 않을 수 있어(그러면 imageAspect가 null로 남아 stroke가 FALLBACK 비율로 왜곡 렌더됨)
  // complete를 직접 확인해 캐시 이미지도 즉시 종횡비를 설정한다.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setImageAspect(img.naturalWidth / img.naturalHeight);
    } else {
      setImageAspect(null);
    }
  }, [imageUrl]);

  // 시트 전환 시 리셋. 부모가 key로 리마운트하지 않으므로(전환 깜박임 방지) 명시적으로 처리한다.
  // 트리거는 sheetId — 두 시트가 같은 imageUrl을 공유해도 정확히 발화하도록 (훅의 paths 초기화와 동일 기준).
  // 1) 진행 중인 그리기 상태를 취소 — 펜을 누른 채 페이지가 바뀌어도 이전 획이 새 시트에 저장되지 않도록
  // 2) 이전 시트의 캔버스 픽셀을 페인트 전에 동기적으로 제거 — 잔상 방지(useLayoutEffect)
  useLayoutEffect(() => {
    isDrawingRef.current = false;
    drawingPointerIdRef.current = null;
    currentPathRef.current = [];
    currentPathIdRef.current = "";
    erasedPathIdsRef.current = new Set();
    activePointersRef.current = new Set();
    // 예약된 redraw 취소 — 클리어 후 남은 rAF가 이전 paths를 다시 그려 잔상이 생기는 것 방지
    cancelAnimationFrame(rafIdRef.current);
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext("2d", { desynchronized: true });
    if (canvas && ctx) {
      // redraw가 남긴 DPR 변환을 초기화하고 전체 버퍼(device px)를 비운다.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [sheetId]);

  // Canvas 크기 설정
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      // backing store를 CSS 레이아웃 크기 × DPR로 설정 — 아이패드(DPR=2)에서 stroke를
      // 기기 해상도로 렌더해 선명하게. (helper가 offsetWidth/Height 사용 → 핀치줌 시 버퍼 미부풀음)
      // canvas.width/height 재설정 시 캔버스 자동 클리어됨 → redraw가 좌표계 변환 후 다시 그림.
      syncCanvasBackingStore(canvas);
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

    // canvas 내부 픽셀을 레이아웃 크기 × DPR과 동기화 — ResizeObserver 갱신이 지연/누락되면
    // 픽셀 종횡비 ≠ 표시 박스 종횡비가 되어 canvas가 비등방 stretch되고 stroke가 어긋난다.
    // (helper는 offsetWidth/Height 사용 — getBoundingClientRect는 핀치줌 시 변환 후 크기를 반환해
    // backing store가 줌 배율만큼 커지고 penWidth 정규화가 오염되므로 금지. 카드 비율 3:4 고정이라 등방 유지.)
    // DPR을 곱해 backing store를 기기 해상도로 키우되, 좌표/굵기 계산은 CSS 단위로 유지하고
    // ctx.setTransform(dpr,…)로 한 번에 스케일 — 이러면 아래 렌더 수식은 그대로 두면 된다.
    const dpr = syncCanvasBackingStore(canvas);

    const ctx = canvas.getContext("2d", { desynchronized: true });
    if (!ctx) return;
    // 모든 그리기를 CSS 픽셀 좌표계로 통일 (backing store는 DPR배). redraw마다 호출 →
    // DPR 변동(디스플레이 이동 등)도 자동 반영.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const drawRect = getCanvasContentRect(canvas, imageAspect);

    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    if (drawRect.width <= 0 || drawRect.height <= 0) return;

    // 저장된 paths 렌더링
    for (const path of paths) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width * drawRect.width; // 정규화된 굵기 복원
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = path.isEraser ? "destination-out" : "source-over";

      const p0 = denormalizePoint(path.points[0], drawRect);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < path.points.length; i++) {
        const p = denormalizePoint(path.points[i], drawRect);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // 원격 진행 중 paths 렌더링
    for (const rip of remoteInProgress) {
      if (rip.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = rip.isEraser ? "#FFFFFF" : rip.color;
      ctx.lineWidth = rip.width * drawRect.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = rip.isEraser ? "destination-out" : "source-over";

      const p0 = denormalizePoint(rip.points[0], drawRect);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < rip.points.length; i++) {
        const p = denormalizePoint(rip.points[i], drawRect);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // 현재 그리고 있는 path (ref에서 읽음 — React 렌더 없이 갱신)
    const curPath = currentPathRef.current;
    if (curPath.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = eraserType === "area" ? "#FFFFFF" : penColor;
      ctx.lineWidth = eraserType === "area" ? eraserWidth : penWidth; // 화면 기준
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = eraserType === "area" ? "destination-out" : "source-over";

      const p0 = denormalizePoint(curPath[0], drawRect);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < curPath.length; i++) {
        const p = denormalizePoint(curPath[i], drawRect);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
  }, [paths, remoteInProgress, penColor, penWidth, eraserType, eraserWidth, imageAspect]);

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

  // DPR만 바뀌는 경우(브라우저 줌, Retina↔비Retina 모니터 이동) ResizeObserver는 CSS 크기가
  // 그대로라 발화하지 않는다. 그러면 backing store가 이전 DPR 버퍼로 남아 HiDPI가 깨지므로,
  // 현재 DPR에 매칭되는 media query로 변경을 감지해 redraw를 예약한다(redraw가 버퍼를 재동기화).
  // media query는 DPR 값에 묶이므로 변경 시마다 새 DPR로 재등록한다.
  useEffect(() => {
    let mql: MediaQueryList | null = null;
    const onChange = () => {
      requestRedraw();
      register();
    };
    const register = () => {
      mql?.removeEventListener("change", onChange);
      mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mql.addEventListener("change", onChange);
    };
    register();
    return () => mql?.removeEventListener("change", onChange);
  }, [requestRedraw]);

  // 포인터 좌표 → 정규화 좌표
  const getPointerCoords = (e: PointerEvent | React.PointerEvent, options: { clamp?: boolean } = {}): Point | null => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const drawRect = getContainedRect(rect.width, rect.height, imageAspect ?? FALLBACK_SHEET_ASPECT);
    if (drawRect.width <= 0 || drawRect.height <= 0) return null;

    const point = normalizePoint(x, y, drawRect);
    if (!options.clamp && (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1)) return null;

    // rect.width/height를 사용하여 CSS transform(줌) 자동 보정
    return { x: clamp01(point.x), y: clamp01(point.y) };
  };

  // 획 지우개: 클릭 지점 근처의 path 찾기
  const findPathAtPoint = useCallback(
    (point: Point): string | null => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return null;
      // CSS 레이아웃 크기 기준 — backing store가 DPR배여도 히트테스트는 CSS px로 유지해
      // threshold(20)가 계속 20 CSS px를 의미하게 한다.
      const drawRect = getCanvasContentRect(canvas, imageAspect);
      if (drawRect.width <= 0 || drawRect.height <= 0) return null;

      const screenPoint = denormalizePoint(point, drawRect);
      const threshold = 20;

      const currentPaths = pathsRef.current;
      for (let i = currentPaths.length - 1; i >= 0; i--) {
        const path = currentPaths[i];
        if (path.isEraser) continue;

        for (let j = 0; j < path.points.length - 1; j++) {
          const p1 = denormalizePoint(path.points[j], drawRect);
          const p2 = denormalizePoint(path.points[j + 1], drawRect);
          const dist = distanceToSegment(screenPoint, p1, p2);
          if (dist <= threshold + (path.width * drawRect.width) / 2) {
            return path.id;
          }
        }
      }
      return null;
    },
    [imageAspect], // pathsRef로 참조하므로 paths 의존성 불필요
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
    // penWidth는 CSS px → CSS 레이아웃 크기로 정규화해야 렌더(CSS 좌표계)와 굵기가 일치.
    const drawRect = getCanvasContentRect(canvas, imageAspect);
    if (drawRect.width <= 0) return;
    const normalizedWidth = eraserType === "area" ? eraserWidth / drawRect.width : penWidth / drawRect.width;

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
    const point = getPointerCoords(e, { clamp: true });
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
        const drawRect = getContainedRect(rect.width, rect.height, imageAspect ?? FALLBACK_SHEET_ASPECT);
        if (drawRect.width <= 0 || drawRect.height <= 0) return;
        for (const ce of coalesced) {
          const cp = normalizePoint(ce.clientX - rect.left, ce.clientY - rect.top, drawRect);
          cp.x = clamp01(cp.x);
          cp.y = clamp01(cp.y);
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
      // penWidth는 CSS px → CSS 레이아웃 크기로 정규화 (handlePointerDown과 동일 기준).
      const drawRect = getCanvasContentRect(canvas, imageAspect);
      if (drawRect.width <= 0) return;
      const normalizedWidth = eraserType === "area" ? eraserWidth / drawRect.width : penWidth / drawRect.width;

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
        <img
          ref={imgRef}
          src={imageUrl}
          alt="악보"
          className="absolute inset-0 w-full h-full pointer-events-none object-contain"
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              setImageAspect(image.naturalWidth / image.naturalHeight);
            }
          }}
        />
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
