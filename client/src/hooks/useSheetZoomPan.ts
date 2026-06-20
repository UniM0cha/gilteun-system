import { useCallback, useRef, useState } from "react";

interface UseSheetZoomPanOptions {
  // 핀치 중심점/보정 계산 기준이 되는 악보 카드 div
  containerRef: React.RefObject<HTMLDivElement | null>;
  // 1-finger 패닝 게이트 (그리기 모드에서는 패닝 안 함)
  isDrawModeRef: React.RefObject<boolean>;
  // 핀치 시작 시 진행 중인 페이지 드래그/애니메이션을 즉시 취소 (pinch 우선)
  cancelPageMotionRef: React.RefObject<() => void>;
}

function parseOriginPercent(origin: string): [number, number] {
  if (origin === "center center") return [50, 50];
  const parts = origin.split(/\s+/);
  return [parseFloat(parts[0]), parseFloat(parts[1])];
}

function getTouchDistance(touches: React.TouchList) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches: React.TouchList) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

// 악보 카드의 핀치줌(2-finger) / 패닝(1-finger, zoom>1) / 더블탭 리셋 제스처.
// CSS transform: scale()을 카드 컨테이너에 적용 — canvas 내부 좌표계는 rect 기반으로 자동 보정된다(client/CLAUDE.md).
export function useSheetZoomPan({ containerRef, isDrawModeRef, cancelPageMotionRef }: UseSheetZoomPanOptions) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [transformOrigin, setTransformOrigin] = useState("center center");
  const scaleRef = useRef(1);
  scaleRef.current = scale;
  const pinchRef = useRef<{
    startDist: number;
    startScale: number;
    startCenter: { x: number; y: number };
    startTranslate: { x: number; y: number };
  } | null>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    startTranslate: { x: number; y: number };
  } | null>(null);
  const lastTapRef = useRef(0);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setTransformOrigin("center center");
  }, []);

  // 페이지 모션 차단 게이트 — useSheetPageMotion의 isBlocked가 호출한다.
  const isZoomActive = useCallback(() => scaleRef.current > 1 || !!pinchRef.current || !!panRef.current, []);

  const handleSheetTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // 진행 중인 page drag/animation 즉시 취소 (pinch 우선)
        cancelPageMotionRef.current();
        // 핀치 시작
        const dist = getTouchDistance(e.touches);
        const center = getTouchCenter(e.touches);
        panRef.current = null;

        // 핀치 중심점을 transformOrigin으로 설정
        // scale > 1이면 origin 변경에 따른 translate 보정으로 위치 점프 방지
        let currentTranslate = { ...translate };
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const newRelX = ((center.x - rect.left) / rect.width) * 100;
          const newRelY = ((center.y - rect.top) / rect.height) * 100;

          if (scaleRef.current > 1) {
            const [oldRelX, oldRelY] = parseOriginPercent(transformOrigin);
            const s = scaleRef.current;
            // rect는 렌더링 크기(CSS너비×scale)이므로 /s로 CSS 원본 너비 복원
            const cssWidth = rect.width / s;
            const cssHeight = rect.height / s;
            currentTranslate = {
              x: translate.x + ((oldRelX - newRelX) / 100) * cssWidth * (1 - s),
              y: translate.y + ((oldRelY - newRelY) / 100) * cssHeight * (1 - s),
            };
            setTranslate(currentTranslate);
          }

          setTransformOrigin(`${newRelX}% ${newRelY}%`);
        }

        pinchRef.current = {
          startDist: dist,
          startScale: scaleRef.current,
          startCenter: center,
          startTranslate: currentTranslate,
        };

        e.preventDefault();
      } else if (e.touches.length === 1) {
        // 더블탭 감지
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          resetZoom();
          e.preventDefault();
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;

        // zoom > 1 + 보기모드 → 패닝 시작
        if (scaleRef.current > 1 && !isDrawModeRef.current) {
          panRef.current = {
            startX: e.touches[0].clientX,
            startY: e.touches[0].clientY,
            startTranslate: { ...translate },
          };
        }
      }
    },
    [translate, transformOrigin, cancelPageMotionRef, containerRef, isDrawModeRef, resetZoom],
  );

  const handleSheetTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dist = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const newScale = Math.min(3, Math.max(1, pinchRef.current.startScale * (dist / pinchRef.current.startDist)));
      const dx = center.x - pinchRef.current.startCenter.x;
      const dy = center.y - pinchRef.current.startCenter.y;

      if (newScale <= 1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setScale(newScale);
        setTranslate({
          x: pinchRef.current.startTranslate.x + dx,
          y: pinchRef.current.startTranslate.y + dy,
        });
      }
      e.preventDefault();
    } else if (e.touches.length === 1 && panRef.current && scaleRef.current > 1) {
      // 1-finger 패닝 (zoom > 1, 보기모드)
      const dx = e.touches[0].clientX - panRef.current.startX;
      const dy = e.touches[0].clientY - panRef.current.startY;
      setTranslate({
        x: panRef.current.startTranslate.x + dx,
        y: panRef.current.startTranslate.y + dy,
      });
      e.preventDefault();
    }
  }, []);

  const handleSheetTouchEnd = useCallback(() => {
    pinchRef.current = null;
    panRef.current = null;
  }, []);

  return {
    scale,
    translate,
    transformOrigin,
    handleSheetTouchStart,
    handleSheetTouchMove,
    handleSheetTouchEnd,
    isZoomActive,
    resetZoom,
  };
}
