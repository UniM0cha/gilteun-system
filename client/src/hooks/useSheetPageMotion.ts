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

  directionRef.current = activeDirection;
  widthRef.current = containerWidth;

  const previewX = useTransform(x, (value) => {
    const dir = directionRef.current;
    const w = widthRef.current;
    if (dir === null || w === 0) return 0;
    return value + dir * w;
  });

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

  const cancelPageMotion = useCallback(() => {
    stopAnimation();
    setIsAnimating(false);
    setIsDragging(false);
    resetPreview();
    x.set(0);
  }, [stopAnimation, x, resetPreview]);

  const goToPageWithMotion = useCallback(
    (nextPage: number) => {
      if (nextPage < 0 || nextPage >= pageCount) return;
      if (nextPage === currentPage) return;
      if (isAnimating) return;

      if (Math.abs(nextPage - currentPage) !== 1) {
        onCommitPage(nextPage);
        return;
      }

      const w = widthRef.current;
      if (w === 0 || reducedMotion) {
        onCommitPage(nextPage);
        return;
      }

      const dir: -1 | 1 = nextPage > currentPage ? 1 : -1;
      setActiveTargetPage(nextPage);
      setActiveDirection(dir);
      directionRef.current = dir;

      const targetX = -dir * w;
      animateTo(targetX, COMMIT_DURATION, () => {
        x.set(0);
        resetPreview();
        onCommitPage(nextPage);
      });
    },
    [currentPage, pageCount, isAnimating, animateTo, onCommitPage, resetPreview, x, reducedMotion],
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
        if (Math.abs(x.get()) > 0.5) {
          resetPreview();
          animateTo(0, SNAP_DURATION);
        } else {
          resetPreview();
        }
        if (isDragging) setIsDragging(false);
        return;
      }

      if (isAnimating) {
        cancel();
        return;
      }

      const w = widthRef.current;
      if (w === 0) {
        cancel();
        return;
      }

      if (first) {
        stopAnimation();
        setIsDragging(true);
        onDragStart?.();
      }

      let intendedTarget: number | null = null;
      let intendedDir: -1 | 1 | null = null;
      if (mx < 0) {
        intendedTarget = currentPage + 1;
        intendedDir = 1;
      } else if (mx > 0) {
        intendedTarget = currentPage - 1;
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
        x.set(offset);
      }

      if (last) {
        setIsDragging(false);
        const absMx = Math.abs(mx);

        if (absMx > CLICK_DRAG_THRESHOLD) {
          markSuppressNextClick();
        }

        if (intendedTarget === null) {
          resetPreview();
          animateTo(0, SNAP_DURATION);
          return;
        }

        const passesDistance = absMx >= w * COMMIT_THRESHOLD_RATIO;
        const velocityAligned = (mx < 0 && dx <= 0) || (mx > 0 && dx >= 0);
        const passesFlick = Math.abs(vx) >= FLICK_VELOCITY && absMx >= FLICK_MIN_PX && velocityAligned;

        if (passesDistance || passesFlick) {
          const dir = intendedDir as -1 | 1;
          const committedTarget = intendedTarget;
          const targetX = -dir * w;
          animateTo(targetX, COMMIT_DURATION, () => {
            x.set(0);
            resetPreview();
            onCommitPage(committedTarget);
          });
        } else {
          resetPreview();
          animateTo(0, SNAP_DURATION);
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
