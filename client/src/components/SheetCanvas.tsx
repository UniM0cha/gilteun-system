import { memo, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import type { DrawingPath, Point } from "@/hooks/useDrawingSync";
import {
  denormalizePoint,
  normalizePoint,
  clamp01,
  fullRect,
  getCanvasContentRect,
  distanceToSegment,
  generateId,
} from "@/lib/canvas";
import { getCanvasRenderSize, renderCanvasAtomically, retainSharedCanvasRenderer } from "@/lib/canvasRender";

export type EraserType = "none" | "area" | "stroke";

// 형광펜 반투명도 — 단일 stroke()로 그리므로 한 획 내 겹침은 alpha가 누적되지 않고(평평한 띠),
// 서로 다른 획이 겹칠 때만 진해진다(실제 형광펜과 동일). 획별 별도 버퍼는 필요 없다.
const HIGHLIGHTER_ALPHA = 0.35;

export interface RemoteInProgressPath {
  pathId: string;
  profileId: string;
  color: string;
  width: number;
  isEraser: boolean;
  isHighlighter: boolean;
  points: Point[];
}

interface SheetCanvasProps {
  sheetId: string;
  imageUrl: string | null;
  isActive?: boolean;
  drawingsReady?: boolean;
  imageLoadAttempt?: number;
  onReadyChange?: (sheetId: string, ready: boolean) => void;
  onRenderMetrics?: (sheetId: string, bytes: number) => void;
  onLoadError?: (sheetId: string) => void;
  isDrawMode: boolean;
  penColor: string;
  penWidth: number;
  isHighlighter: boolean;
  eraserType: EraserType;
  eraserWidth: number;
  paths: DrawingPath[];
  remoteInProgress: RemoteInProgressPath[];
  // 펜으로만 그리기(팜 리젝션) — touch 포인터로는 획을 시작하지 않는다. pen/mouse는 계속 그린다.
  penOnly: boolean;
  // 스타일러스 최초 감지 알림. 반환값 = "이 호출로 펜 전용이 켜졌는가".
  // 자동 감지가 켜지는 프레임에는 penOnly prop이 아직 이전 값이라 반환값으로 판단해야
  // "팜이 먼저 닿고 곧바로 펜이 닿는" 첫 획부터 팜 리젝션이 적용된다.
  onPenDetected?: () => boolean;
  onDrawCancel?: (data: { pathId: string }) => void;
  onDrawStart?: (data: {
    pathId: string;
    color: string;
    width: number;
    isEraser: boolean;
    isHighlighter: boolean;
    point: Point;
  }) => void;
  onDrawMove?: (data: { pathId: string; point: Point }) => void;
  onPathAdd?: (path: DrawingPath) => void;
  onPathDelete?: (pathId: string) => void;
  onBatchStart?: () => void;
  onBatchEnd?: () => void;
  profileId: string;
}

function SheetCanvas({
  sheetId,
  imageUrl,
  isActive = true,
  drawingsReady = true,
  imageLoadAttempt = 0,
  onReadyChange,
  onRenderMetrics,
  onLoadError,
  isDrawMode,
  penColor,
  penWidth,
  isHighlighter,
  eraserType,
  eraserWidth,
  paths,
  remoteInProgress,
  penOnly,
  onPenDetected,
  onDrawCancel,
  onDrawStart,
  onDrawMove,
  onPathAdd,
  onPathDelete,
  onBatchStart,
  onBatchEnd,
  profileId,
}: SheetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetIdRef = useRef(sheetId);
  sheetIdRef.current = sheetId;
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageReadyRef = useRef(false);
  const imageGenerationRef = useRef(0);
  const readyRef = useRef<{ sheetId: string; ready: boolean } | null>(null);
  const callbacksRef = useRef({ onReadyChange, onRenderMetrics, onLoadError });
  callbacksRef.current = { onReadyChange, onRenderMetrics, onLoadError };
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const drawingSessionRef = useRef<{
    eraserType: EraserType;
    penColor: string;
    width: number;
    isHighlighter: boolean;
    profileId: string;
    onDrawCancel: SheetCanvasProps["onDrawCancel"];
    onDrawMove: SheetCanvasProps["onDrawMove"];
    onPathAdd: SheetCanvasProps["onPathAdd"];
    onPathDelete: SheetCanvasProps["onPathDelete"];
    onBatchEnd: SheetCanvasProps["onBatchEnd"];
  } | null>(null);
  const lastRenderRef = useRef<{
    sheetId: string;
    paths: DrawingPath[];
    remoteInProgress: RemoteInProgressPath[];
    currentPath: Point[];
    currentPointCount: number;
    cssWidth: number;
    cssHeight: number;
    dpr: number;
  } | null>(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<Point[]>([]);
  const currentPathIdRef = useRef<string>("");
  const drawingPointerIdRef = useRef<number | null>(null);

  const lastMoveTimeRef = useRef(0);
  const redrawCanvasRef = useRef<() => void>(() => {});
  // 이 마운트에서 스타일러스를 이미 봤는지 — onPenDetected 중복 호출 방지
  const penSeenRef = useRef(false);
  // effect에서 cancelDrawing을 호출하기 위한 미러 (직접 호출하면 exhaustive-deps 경고)
  const cancelDrawingRef = useRef<() => void>(() => {});
  const rafIdRef = useRef(0);
  const erasedPathIdsRef = useRef<Set<string>>(new Set());
  const activePointersRef = useRef<Set<number>>(new Set());

  // props를 ref로 유지 (native event listener에서 최신 값 참조용)
  const isDrawModeRef = useRef(isDrawMode);
  isDrawModeRef.current = isDrawMode;

  // 현재 paths를 ref로 유지 (findPathAtPoint에서 최신 값 참조용)
  const pathsRef = useRef(paths);
  pathsRef.current = paths;

  const publishReady = useCallback((id: string, ready: boolean) => {
    if (readyRef.current?.sheetId === id && readyRef.current.ready === ready) return;
    readyRef.current = { sheetId: id, ready };
    callbacksRef.current.onReadyChange?.(id, ready);
  }, []);

  // A retained page changes only its position/active flag when it becomes the
  // main page. Input cleanup never clears its completed drawing pixels.
  useLayoutEffect(() => {
    if (!isActive) cancelDrawingRef.current();
    return () => cancelDrawingRef.current();
  }, [sheetId, isActive]);

  useLayoutEffect(() => {
    const release = retainSharedCanvasRenderer();
    const canvas = drawingCanvasRef.current;
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      release();
      lastRenderRef.current = null;
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      callbacksRef.current.onRenderMetrics?.(sheetIdRef.current, 0);
      publishReady(sheetIdRef.current, false);
    };
  }, [publishReady]);

  const prepareImage = useCallback(async () => {
    const img = imageRef.current;
    if (!img || !imageUrl || img.getAttribute("src") !== imageUrl) return;
    const generation = imageGenerationRef.current;
    try {
      if (img.decode) await img.decode();
      if (imageGenerationRef.current !== generation || imageRef.current !== img) return;
      if (img.naturalWidth <= 0) throw new Error("Image has no decoded pixels");
      imageReadyRef.current = true;
      redrawCanvasRef.current();
    } catch {
      if (imageGenerationRef.current !== generation || imageRef.current !== img) return;
      imageReadyRef.current = false;
      publishReady(sheetId, false);
      callbacksRef.current.onLoadError?.(sheetId);
    }
  }, [imageUrl, sheetId, publishReady]);

  useLayoutEffect(() => {
    imageGenerationRef.current += 1;
    imageReadyRef.current = !imageUrl;
    publishReady(sheetId, false);
    if (imageUrl && imageRef.current?.complete) void prepareImage();
    else if (!imageUrl) redrawCanvasRef.current();
    return () => {
      imageGenerationRef.current += 1;
    };
  }, [imageUrl, imageLoadAttempt, sheetId, prepareImage, publishReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeCanvas = () => redrawCanvasRef.current();
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
      if (isActiveRef.current && isDrawModeRef.current) {
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

    const size = getCanvasRenderSize(canvas);
    if (!size || !drawingsReady) {
      publishReady(sheetId, false);
      return;
    }
    const curPath = currentPathRef.current;
    const previous = lastRenderRef.current;
    if (
      previous?.sheetId === sheetId &&
      previous.paths === paths &&
      previous.remoteInProgress === remoteInProgress &&
      previous.currentPath === curPath &&
      previous.currentPointCount === curPath.length &&
      previous.cssWidth === size.rect.width &&
      previous.cssHeight === size.rect.height &&
      previous.dpr === size.dpr
    ) {
      publishReady(sheetId, imageReadyRef.current);
      return;
    }
    publishReady(sheetId, false);
    const bytes = renderCanvasAtomically(canvas, size, (ctx, drawRect) => {
      // 저장된 paths 렌더링
      for (const path of paths) {
        if (path.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width * drawRect.width; // 정규화된 굵기 복원
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = path.isEraser ? "destination-out" : "source-over";
        // 지우개(destination-out)엔 alpha를 적용하지 않음 — 손상된 데이터로 isEraser+isHighlighter가
        // 함께 true여도 부분 지우기가 되지 않도록 방어.
        ctx.globalAlpha = path.isHighlighter && !path.isEraser ? HIGHLIGHTER_ALPHA : 1;

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
        ctx.globalAlpha = rip.isHighlighter && !rip.isEraser ? HIGHLIGHTER_ALPHA : 1;

        const p0 = denormalizePoint(rip.points[0], drawRect);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < rip.points.length; i++) {
          const p = denormalizePoint(rip.points[i], drawRect);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // 현재 그리고 있는 path (ref에서 읽음 — React 렌더 없이 갱신)
      const session = drawingSessionRef.current;
      if (session && curPath.length >= 2) {
        ctx.beginPath();
        ctx.strokeStyle = session.eraserType === "area" ? "#FFFFFF" : session.penColor;
        ctx.lineWidth = session.width * drawRect.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = session.eraserType === "area" ? "destination-out" : "source-over";
        ctx.globalAlpha = session.eraserType === "none" && session.isHighlighter ? HIGHLIGHTER_ALPHA : 1;

        const p0 = denormalizePoint(curPath[0], drawRect);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < curPath.length; i++) {
          const p = denormalizePoint(curPath[i], drawRect);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1; // 형광펜 alpha 누수 방지 — 다음 redraw·다른 컨텍스트 사용이 반투명해지지 않도록
    });
    if (bytes === null) return;
    lastRenderRef.current = {
      sheetId,
      paths,
      remoteInProgress,
      currentPath: curPath,
      currentPointCount: curPath.length,
      cssWidth: size.rect.width,
      cssHeight: size.rect.height,
      dpr: size.dpr,
    };
    callbacksRef.current.onRenderMetrics?.(sheetId, bytes);
    publishReady(sheetId, imageReadyRef.current);
  }, [paths, remoteInProgress, drawingsReady, sheetId, publishReady]);

  // redraw ref 갱신 (ResizeObserver + rAF에서 사용)
  redrawCanvasRef.current = redrawCanvas;

  // rAF 기반 리드로우 요청 (동일 프레임 내 여러 호출 → 1회만 실행)
  const requestRedraw = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => redrawCanvasRef.current());
  }, []);

  // Complete changed data before a retained page can be exposed. Switching the
  // active flag or tool settings does not invalidate the completed bitmap.
  useLayoutEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // DPR만 바뀌는 경우(브라우저 줌, Retina↔비Retina 모니터 이동) ResizeObserver는 CSS 크기가
  // 그대로라 발화하지 않는다. 그러면 backing store가 이전 DPR 버퍼로 남아 HiDPI가 깨지므로,
  // 현재 DPR에 매칭되는 media query로 변경을 감지해 redraw를 예약한다(redraw가 버퍼를 재동기화).
  // media query는 DPR 값에 묶이므로 변경 시마다 새 DPR로 재등록한다.
  useEffect(() => {
    let mql: MediaQueryList | null = null;
    const onChange = () => {
      redrawCanvasRef.current();
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
    // 그리기 영역 = 캔버스(흰 카드) 전체. getBoundingClientRect로 CSS transform(줌) 자동 보정.
    const drawRect = fullRect(rect.width, rect.height);
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
      const drawRect = getCanvasContentRect(canvas);
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
    [], // pathsRef로 참조하므로 paths 의존성 불필요 (좌표계가 이미지에 의존하지 않음)
  );

  const releaseDrawingPointer = () => {
    const pointerId = drawingPointerIdRef.current;
    drawingPointerIdRef.current = null;
    const canvas = drawingCanvasRef.current;
    if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  };

  // Capture a stroke's tool and callbacks at pointer-down. Page deactivation
  // cannot redirect a cancellation or batch completion into another page.
  const cancelDrawing = () => {
    const session = drawingSessionRef.current;
    const hadDrawing = isDrawingRef.current;
    isDrawingRef.current = false;
    if (hadDrawing && session?.eraserType === "stroke") {
      session.onBatchEnd?.();
    } else if (hadDrawing && currentPathIdRef.current) {
      session?.onDrawCancel?.({ pathId: currentPathIdRef.current });
    }
    releaseDrawingPointer();
    erasedPathIdsRef.current.clear();
    if (hadDrawing) {
      currentPathRef.current = [];
      currentPathIdRef.current = "";
      drawingSessionRef.current = null;
      requestRedraw();
    }
  };
  cancelDrawingRef.current = () => {
    cancelDrawing();
    const canvas = drawingCanvasRef.current;
    for (const id of activePointersRef.current) {
      if (canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
    activePointersRef.current.clear();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isActive || !isDrawMode || !drawingsReady || !imageReadyRef.current) return;

    // 스타일러스 최초 감지 → 부모가 펜 전용 모드를 자동으로 켠다(기기당 1회).
    // 켜진 프레임에는 penOnly prop이 아직 이전 값이므로 반환값으로 판단해야
    // 그 즉시 아래 팜 리젝션이 적용된다.
    let penOnlyNow = penOnly;
    if (e.pointerType === "pen" && !penSeenRef.current) {
      penSeenRef.current = true;
      if (onPenDetected?.()) penOnlyNow = true;
    }

    // 펜 전용: 손가락/손바닥은 그리기에 관여하지 않는다.
    // activePointersRef에 넣지 않는 것이 핵심 — 넣으면 팜을 얹은 채 펜으로 그릴 때
    // 아래 2포인터 핸드오프가 발동해 획이 끊긴다.
    // 핀치줌은 이 반환에 영향받지 않는다 — useSheetZoomPan은 TouchEvent(e.touches)로 동작하고,
    // 캔버스의 native touchstart 리스너가 2점 이상일 때는 stopPropagation을 걸지 않아 부모까지 간다.
    if (penOnlyNow && e.pointerType === "touch") return;

    // 펜이 닿으면 손가락/팜이 점유하던 상태를 회수한다(펜 우선).
    // 1) 진행 중이던 손가락 획을 취소 — 피어에게도 drawing:cancel이 나간다.
    // 2) 카운터를 비워 팜이 남긴 pointerId 때문에 펜의 첫 획이 핸드오프로 삼켜지는 것을 막는다.
    //    팜이 캔버스 밖에서 눌려 획을 시작하지 못한 경우에도 id는 남아 있으므로 clear가 필요하다.
    //    남은 id의 pointerup은 없는 키를 delete하는 no-op이라 안전하다.
    //    이 Set은 지금도 mouse·pen을 담고 있고 펜 전용이 꺼져 있으면 touch까지 담는다.
    //    펜 우선 정책상 그것들도 함께 비우는 게 의도다(펜이 닿는 순간 이전 점유는 무효).
    if (penOnlyNow && e.pointerType === "pen") {
      cancelDrawing();
      activePointersRef.current.clear();
    }

    activePointersRef.current.add(e.pointerId);

    // 2+ 포인터 → 그리기 취소, 부모 핀치줌으로 위임
    // (펜 전용에서는 터치가 카운트되지 않아 팜을 얹어도 발동하지 않는다)
    if (activePointersRef.current.size >= 2) {
      cancelDrawing();
      return;
    }

    e.stopPropagation();
    const point = getPointerCoords(e);
    if (!point) return;

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const drawRect = getCanvasContentRect(canvas);
    if (drawRect.width <= 0) return;
    const normalizedWidth = (eraserType === "area" ? eraserWidth : penWidth) / drawRect.width;
    drawingSessionRef.current = {
      eraserType,
      penColor,
      width: normalizedWidth,
      isHighlighter,
      profileId,
      onDrawCancel,
      onDrawMove,
      onPathAdd,
      onPathDelete,
      onBatchEnd,
    };
    // 포인터 캡처 — 요소 밖 드래그에도 이벤트 수신
    canvas.setPointerCapture(e.pointerId);
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

    onDrawStart?.({
      pathId,
      color: eraserType === "area" ? "#FFFFFF" : penColor,
      width: normalizedWidth,
      isEraser: eraserType === "area",
      isHighlighter: eraserType === "none" && isHighlighter,
      point,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isActive || !isDrawingRef.current || !isDrawMode) return;
    const session = drawingSessionRef.current;
    if (!session) return;
    // 그리기 중인 포인터가 아니면 무시
    if (e.pointerId !== drawingPointerIdRef.current) return;

    e.stopPropagation();
    const point = getPointerCoords(e, { clamp: true });
    if (!point) return;

    // 드래그 획 지우개: 연속으로 path 삭제
    if (session.eraserType === "stroke") {
      const pathId = findPathAtPoint(point);
      if (pathId && !erasedPathIdsRef.current.has(pathId)) {
        erasedPathIdsRef.current.add(pathId);
        session.onPathDelete?.(pathId);
      }
      return;
    }

    // Coalesced events — Apple Pencil ~240Hz 입력 복원
    const coalesced = e.nativeEvent.getCoalescedEvents?.();
    if (coalesced && coalesced.length > 1) {
      const canvas = drawingCanvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const drawRect = fullRect(rect.width, rect.height);
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
      session.onDrawMove?.({ pathId: currentPathIdRef.current, point });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (!isActive) {
      cancelDrawing();
      return;
    }
    if (e.pointerId !== drawingPointerIdRef.current || !isDrawingRef.current) return;
    const session = drawingSessionRef.current;
    if (!session) return;
    isDrawingRef.current = false;
    releaseDrawingPointer();

    if (session.eraserType === "stroke") {
      session.onBatchEnd?.();
      erasedPathIdsRef.current.clear();
    } else if (currentPathRef.current.length > 1) {
      session.onPathAdd?.({
        id: currentPathIdRef.current,
        sheetId,
        profileId: session.profileId,
        color: session.eraserType === "area" ? "#FFFFFF" : session.penColor,
        width: session.width,
        points: [...currentPathRef.current],
        isEraser: session.eraserType === "area",
        isHighlighter: session.eraserType === "none" && session.isHighlighter,
      });
    } else if (currentPathIdRef.current) {
      session.onDrawCancel?.({ pathId: currentPathIdRef.current });
    }
    currentPathRef.current = [];
    currentPathIdRef.current = "";
    drawingSessionRef.current = null;
    requestRedraw();
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (e.pointerId === drawingPointerIdRef.current) cancelDrawing();
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {imageUrl && (
        <img
          key={`${imageUrl}:${imageLoadAttempt}`}
          ref={imageRef}
          src={imageUrl}
          alt="악보"
          className="absolute inset-0 w-full h-full pointer-events-none object-contain"
          onLoad={() => void prepareImage()}
          onError={() => {
            imageReadyRef.current = false;
            publishReady(sheetId, false);
            callbacksRef.current.onLoadError?.(sheetId);
          }}
        />
      )}

      <canvas
        ref={drawingCanvasRef}
        className={`absolute inset-0 w-full h-full ${
          isDrawMode ? (eraserType === "stroke" ? "cursor-pointer" : "cursor-crosshair") : "cursor-default"
        }`}
        data-sheet-id={sheetId}
        style={{
          touchAction: "none",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          pointerEvents: isActive ? "auto" : "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
      />

      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-xl text-muted-foreground">악보를 업로드하세요</p>
          </div>
        </div>
      )}
    </div>
  );
}

// 부모(Worship) 리렌더(presence/navbar/compact 등)가 잦으므로 memo로 감싼다.
// props 콜백은 useDrawingSync에서 useCallback으로 안정화돼 있어 memo가 실효를 가진다.
export default memo(SheetCanvas);
