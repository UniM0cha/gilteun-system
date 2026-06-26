import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { animate, useMotionValue, useTransform } from "motion/react";
import { useDrag } from "@use-gesture/react";

interface UseSheetPageMotionOptions {
  currentPage: number;
  pageCount: number;
  containerRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  isBlocked: () => boolean;
  onCommitPage: (nextPage: number) => void;
  onDragStart?: () => void;
  reducedMotion?: boolean;
}

const COMMIT_THRESHOLD_RATIO = 0.25;
const FLICK_VELOCITY = 0.5;
const FLICK_MIN_PX = 48;
const CLICK_DRAG_THRESHOLD = 6;
const CLICK_SUPPRESSION_MS = 350;
const COMMIT_DURATION = 0.24;
const SNAP_DURATION = 0.18;
const REDUCED_DURATION = 0.01;
const EASING: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function useSheetPageMotion({
  currentPage,
  pageCount,
  containerRef,
  enabled,
  isBlocked,
  onCommitPage,
  onDragStart,
  reducedMotion = false,
}: UseSheetPageMotionOptions) {
  const x = useMotionValue(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeTargetPage, setActiveTargetPage] = useState<number | null>(null);
  const [activeDirection, setActiveDirection] = useState<-1 | 1 | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const suppressNextClickRef = useRef(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);
  const directionRef = useRef<-1 | 1 | null>(null);
  const widthRef = useRef(0);

  // 진행 중인 전환을 끊김 없이 이어받기 위한 상태(빠른 연속 스와이프 지원)
  // - committedPageRef: 훅이 동기적으로 아는 "현재 홈 페이지". 부모 currentPage는
  //   onCommitPage가 비동기라 한 프레임 늦으므로, 인터럽트한 제스처가 직전 목표를
  //   기준으로 다음 페이지를 계산할 수 있도록 훅이 직접 들고 있는다.
  // - inFlightRef: 진행 중인 커밋 애니메이션이 향하던 목표(인터럽트 시 무엇을 확정할지).
  // - baseOffsetRef: 인터럽트 후 이어받은 드래그의 시작 앵커. active에서 x = base + mx.
  const committedPageRef = useRef(currentPage);
  const inFlightRef = useRef<{ target: number; dir: -1 | 1 } | null>(null);
  const baseOffsetRef = useRef(0);

  directionRef.current = activeDirection;
  widthRef.current = containerWidth;

  const previewX = useTransform(x, (value) => {
    const dir = directionRef.current;
    const w = widthRef.current;
    if (dir === null || w === 0) return 0;
    return value + dir * w;
  });

  // 부모 currentPage 변화를 따라가되, 훅이 직접 리드 중(드래그/커밋 진행)일 땐
  // committedPageRef를 덮어쓰지 않는다 — 연속 스와이프 체이닝 중 off-by-one 방지.
  // (사이드바 클릭 등 외부 페이지 변경은 idle 상태에서 동기화된다.)
  useEffect(() => {
    if (!isDragging && inFlightRef.current === null) {
      committedPageRef.current = currentPage;
    }
  }, [currentPage, isDragging]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [containerRef]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
  }, []);

  const markSuppressNextClick = useCallback(() => {
    suppressNextClickRef.current = true;
    if (suppressTimerRef.current) {
      clearTimeout(suppressTimerRef.current);
    }
    suppressTimerRef.current = setTimeout(() => {
      suppressNextClickRef.current = false;
      suppressTimerRef.current = null;
    }, CLICK_SUPPRESSION_MS);
  }, []);

  const resetPreview = useCallback(() => {
    setActiveTargetPage(null);
    setActiveDirection(null);
    directionRef.current = null;
  }, []);

  const animateTo = useCallback(
    (target: number, duration: number, onComplete?: () => void) => {
      stopAnimation();
      setIsAnimating(true);
      const ctrl = animate(x, target, {
        duration: reducedMotion ? REDUCED_DURATION : duration,
        ease: EASING,
      });
      animationRef.current = ctrl;
      ctrl.then(
        () => {
          if (animationRef.current === ctrl) {
            animationRef.current = null;
          }
          setIsAnimating(false);
          onComplete?.();
        },
        () => {
          if (animationRef.current === ctrl) {
            animationRef.current = null;
          }
        },
      );
    },
    [x, stopAnimation, reducedMotion],
  );

  // 드래그 인터럽트용: 진행 중이던 커밋을 즉시 "확정"하되, 들어오던 미리보기 카드를
  // 같은 화면 위치에 그대로 둬서 점프 없이 새 드래그로 이어받는다.
  // 미리보기(target)는 previewX = x + dir*w 위치에 있으므로 그 좌표를 새 메인 카드의
  // 시작 앵커(baseOffset)로 삼고 x도 그 자리에 둔다. onCommitPage로 부모가 target을
  // 메인으로 렌더 → x.set과 같은 프레임에 반영되어 깜빡임 없음(기존 완료 콜백과 동일 패턴).
  const finalizeInFlightForDrag = useCallback(() => {
    const inFlight = inFlightRef.current;
    if (!inFlight) return;
    const { target, dir } = inFlight;
    const w = widthRef.current;
    stopAnimation();
    const newX = x.get() + dir * w;
    baseOffsetRef.current = newX;
    committedPageRef.current = target;
    inFlightRef.current = null;
    resetPreview();
    setIsAnimating(false);
    x.set(newX);
    onCommitPage(target);
  }, [stopAnimation, x, resetPreview, onCommitPage]);

  // 버튼/프로그램 내비용: 진행 중 커밋을 즉시 홈으로 마무리(작은 스냅 허용).
  const hardFinalizeInFlight = useCallback(() => {
    const inFlight = inFlightRef.current;
    if (!inFlight) return;
    const { target } = inFlight;
    stopAnimation();
    baseOffsetRef.current = 0;
    committedPageRef.current = target;
    inFlightRef.current = null;
    resetPreview();
    setIsAnimating(false);
    x.set(0);
    onCommitPage(target);
  }, [stopAnimation, x, resetPreview, onCommitPage]);

  const cancelPageMotion = useCallback(() => {
    stopAnimation();
    setIsAnimating(false);
    setIsDragging(false);
    resetPreview();
    inFlightRef.current = null;
    baseOffsetRef.current = 0;
    x.set(0);
  }, [stopAnimation, x, resetPreview]);

  const goToPageWithMotion = useCallback(
    (nextPage: number) => {
      if (nextPage < 0 || nextPage >= pageCount) return;
      // 진행 중 전환이 있으면 즉시 마무리한 뒤 새 내비게이션을 시작한다.
      if (inFlightRef.current) hardFinalizeInFlight();

      const fromPage = committedPageRef.current;
      if (nextPage === fromPage) return;

      if (Math.abs(nextPage - fromPage) !== 1) {
        baseOffsetRef.current = 0;
        committedPageRef.current = nextPage;
        x.set(0);
        onCommitPage(nextPage);
        return;
      }

      const w = widthRef.current;
      if (w === 0 || reducedMotion) {
        baseOffsetRef.current = 0;
        committedPageRef.current = nextPage;
        x.set(0);
        onCommitPage(nextPage);
        return;
      }

      const dir: -1 | 1 = nextPage > fromPage ? 1 : -1;
      setActiveTargetPage(nextPage);
      setActiveDirection(dir);
      directionRef.current = dir;

      const targetX = -dir * w;
      inFlightRef.current = { target: nextPage, dir };
      animateTo(targetX, COMMIT_DURATION, () => {
        baseOffsetRef.current = 0;
        committedPageRef.current = nextPage;
        inFlightRef.current = null;
        x.set(0);
        resetPreview();
        onCommitPage(nextPage);
      });
    },
    [pageCount, hardFinalizeInFlight, animateTo, onCommitPage, resetPreview, x, reducedMotion],
  );

  const bindPageDrag = useDrag(
    ({ active, movement: [mx], velocity: [vx], direction: [dx], cancel, first, last, tap }) => {
      if (tap) return;

      if (!enabled || pageCount <= 1) {
        cancel();
        cancelPageMotion();
        return;
      }

      if (isBlocked()) {
        cancel();
        stopAnimation();
        inFlightRef.current = null;
        resetPreview();
        if (Math.abs(x.get()) > 0.5) {
          animateTo(0, SNAP_DURATION, () => {
            baseOffsetRef.current = 0;
          });
        } else {
          baseOffsetRef.current = 0;
          x.set(0);
        }
        if (isDragging) setIsDragging(false);
        return;
      }

      const w = widthRef.current;
      if (w === 0) {
        cancel();
        return;
      }

      if (first) {
        // 진행 중 전환을 끊김 없이 이어받는다(있을 때만). 없으면 단순히 현 애니메이션 정지.
        if (inFlightRef.current) {
          finalizeInFlightForDrag();
        } else {
          stopAnimation();
        }
        setIsDragging(true);
        onDragStart?.();
      }

      // 인터럽트 직후엔 부모 currentPage가 아직 갱신 전이므로 committedPageRef 기준으로 계산.
      const fromPage = committedPageRef.current;
      let intendedTarget: number | null = null;
      let intendedDir: -1 | 1 | null = null;
      if (mx < 0) {
        intendedTarget = fromPage + 1;
        intendedDir = 1;
      } else if (mx > 0) {
        intendedTarget = fromPage - 1;
        intendedDir = -1;
      }

      const outOfBounds = intendedTarget !== null && (intendedTarget < 0 || intendedTarget >= pageCount);

      let offset = mx;
      if (outOfBounds) {
        offset = mx * 0.25;
        intendedTarget = null;
        intendedDir = null;
      }

      if (active) {
        if (Math.abs(mx) > CLICK_DRAG_THRESHOLD) {
          markSuppressNextClick();
        }
        if (intendedTarget !== activeTargetPage) {
          setActiveTargetPage(intendedTarget);
        }
        if (intendedDir !== activeDirection) {
          directionRef.current = intendedDir;
          setActiveDirection(intendedDir);
        }
        // baseOffset은 인터럽트로 이어받은 드래그의 시작 좌표(일반 드래그는 0).
        x.set(baseOffsetRef.current + offset);
      }

      if (last) {
        setIsDragging(false);
        const absMx = Math.abs(mx);

        if (absMx > CLICK_DRAG_THRESHOLD) {
          markSuppressNextClick();
        }

        if (intendedTarget === null) {
          resetPreview();
          animateTo(0, SNAP_DURATION, () => {
            baseOffsetRef.current = 0;
          });
          return;
        }

        const passesDistance = absMx >= w * COMMIT_THRESHOLD_RATIO;
        const velocityAligned = (mx < 0 && dx <= 0) || (mx > 0 && dx >= 0);
        const passesFlick = Math.abs(vx) >= FLICK_VELOCITY && absMx >= FLICK_MIN_PX && velocityAligned;

        if (passesDistance || passesFlick) {
          const dir = intendedDir as -1 | 1;
          const committedTarget = intendedTarget;
          // 스냅/커밋 목표는 현재 페이지의 표준 좌표계(홈=0, 다음=-dir*w) 기준.
          const targetX = -dir * w;
          inFlightRef.current = { target: committedTarget, dir };
          animateTo(targetX, COMMIT_DURATION, () => {
            baseOffsetRef.current = 0;
            committedPageRef.current = committedTarget;
            inFlightRef.current = null;
            x.set(0);
            resetPreview();
            onCommitPage(committedTarget);
          });
        } else {
          resetPreview();
          animateTo(0, SNAP_DURATION, () => {
            baseOffsetRef.current = 0;
          });
        }
      }
    },
    {
      axis: "x",
      filterTaps: true,
      eventOptions: { passive: false },
    },
  );

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      if (suppressTimerRef.current) {
        clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = null;
      }
    };
  }, []);

  return {
    x,
    previewX,
    containerWidth,
    activeTargetPage,
    activeDirection,
    isDragging,
    isAnimating,
    suppressNextClickRef,
    bindPageDrag,
    goToPageWithMotion,
    cancelPageMotion,
  };
}
