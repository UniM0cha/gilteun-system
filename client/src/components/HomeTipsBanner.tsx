import { useCallback, useEffect, useRef, useState } from "react";
import { Lightbulb, ChevronRight, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useSwipeable } from "react-swipeable";
import { FEATURE_TIPS, LATEST_TIP_VERSION } from "@/data/tips";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const SEEN_TIPS_STORAGE_KEY = "gilteun-seen-tips-version";

function hasSeenLatestTips(): boolean {
  try {
    return window.localStorage.getItem(SEEN_TIPS_STORAGE_KEY) === LATEST_TIP_VERSION;
  } catch {
    return false;
  }
}

function markLatestTipsSeen(): void {
  try {
    window.localStorage.setItem(SEEN_TIPS_STORAGE_KEY, LATEST_TIP_VERSION);
  } catch {
    // 프라이빗 브라우징 등에서 localStorage 접근이 차단되어도 동작을 유지한다
  }
}

interface HomeTipsBannerProps {
  className?: string;
}

export function HomeTipsBanner({ className }: HomeTipsBannerProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [hasUnreadNew, setHasUnreadNew] = useState(() => !hasSeenLatestTips());
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const latestTip = FEATURE_TIPS[0];
  const currentTip = FEATURE_TIPS[index];
  const isLastSlide = index === FEATURE_TIPS.length - 1;

  const goToSlide = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(FEATURE_TIPS.length - 1, nextIndex));
      if (clamped === index) return;
      setDirection(clamped > index ? 1 : -1);
      setIndex(clamped);
      if (bodyRef.current) {
        bodyRef.current.scrollTop = 0;
      }
    },
    [index],
  );

  const { ref: swipeRef, ...swipeEventHandlers } = useSwipeable({
    onSwipedLeft: () => {
      if (index < FEATURE_TIPS.length - 1) {
        goToSlide(index + 1);
      }
    },
    onSwipedRight: () => {
      if (index > 0) {
        goToSlide(index - 1);
      }
    },
    delta: 48,
    trackMouse: true,
    preventScrollOnSwipe: false,
  });

  const setBodyRefs = useCallback(
    (node: HTMLDivElement | null) => {
      bodyRef.current = node;
      swipeRef(node);
    },
    [swipeRef],
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        goToSlide(index - 1);
      } else if (e.key === "ArrowRight" && index < FEATURE_TIPS.length - 1) {
        e.preventDefault();
        goToSlide(index + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, index, goToSlide]);

  const handleOpen = () => {
    setIndex(0);
    setDirection(1);
    setOpen(true);
    if (hasUnreadNew) {
      setHasUnreadNew(false);
    }
    markLatestTipsSeen();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "w-full min-h-11 rounded-xl border bg-card px-3.5 py-2.5 sm:px-4 sm:py-3 hover:bg-accent transition-colors flex items-center justify-between gap-3 text-left",
          className,
        )}
      >
        <div className="min-w-0 flex items-center gap-2">
          <Lightbulb className="size-4 text-primary shrink-0" />
          {hasUnreadNew ? (
            <Badge className="shrink-0">NEW</Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">
              팁
            </Badge>
          )}
          <span className="truncate text-sm font-medium">{latestTip.title}</span>
        </div>
        <span className="inline-flex items-center gap-0.5 shrink-0 text-xs font-semibold text-primary whitespace-nowrap">
          <span className="sm:hidden">보기</span>
          <span className="hidden sm:inline">자세히 보기</span>
          <ChevronRight className="size-4" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl sm:max-w-2xl max-h-[88dvh] flex flex-col p-0 gap-0 overflow-hidden"
          showCloseButton={false}
        >
          {/* 고정 헤더 */}
          <div className="px-4 py-3 sm:px-5 border-b flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-primary">{currentTip.category}</span>
              {currentTip.isNew && <Badge>NEW</Badge>}
              <span className="text-xs text-muted-foreground tabular-nums">
                {index + 1} / {FEATURE_TIPS.length}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label="닫기"
              onClick={() => setOpen(false)}
            >
              <X />
            </Button>
          </div>

          {/* 좌우 스와이프 + 세로 스크롤 본문 */}
          <div
            {...swipeEventHandlers}
            ref={setBodyRefs}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-6"
          >
            <motion.div
              key={currentTip.id}
              initial={prefersReducedMotion ? false : { opacity: 0, x: direction * 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: [0.33, 1, 0.68, 1] }}
            >
              <DialogTitle className="text-base sm:text-lg font-bold leading-snug">{currentTip.title}</DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed">{currentTip.description}</DialogDescription>

              {currentTip.steps && currentTip.steps.length > 0 && (
                <div className="mt-5 border-t pt-4">
                  <ol className="flex flex-col gap-4">
                    {currentTip.steps.map((step, stepIndex) => (
                      <li key={step.title} className="rounded-xl border bg-muted/20 p-3.5 sm:p-4 flex flex-col gap-2.5">
                        <div className="flex items-start gap-2.5">
                          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {stepIndex + 1}
                          </span>
                          <div className="min-w-0 flex-1 flex flex-col gap-1">
                            <div className="text-sm font-semibold">{step.title}</div>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                        {step.imageSrc && (
                          <div className="w-full overflow-hidden rounded-lg border bg-background">
                            <img
                              src={step.imageSrc}
                              alt={step.imageAlt ?? step.title}
                              className="w-full h-auto object-contain select-none"
                              loading="lazy"
                              draggable={false}
                            />
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </motion.div>
          </div>

          {/* 고정 푸터 */}
          <div className="border-t bg-muted/30 px-4 py-3 sm:px-5 flex items-center justify-between gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={index === 0}
              onClick={() => goToSlide(index - 1)}
            >
              이전
            </Button>

            <div className="flex items-center gap-1">
              {FEATURE_TIPS.map((tip, i) => (
                <button
                  key={tip.id}
                  type="button"
                  aria-label={`${i + 1}번 팁 보기`}
                  onClick={() => goToSlide(i)}
                  className="flex h-8 items-center justify-center px-1 cursor-pointer"
                >
                  <span
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === index ? "w-5 bg-primary" : "w-2 bg-border hover:bg-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>

            {isLastSlide ? (
              <Button type="button" className="h-11" onClick={() => setOpen(false)}>
                닫기
              </Button>
            ) : (
              <Button type="button" className="h-11" onClick={() => goToSlide(index + 1)}>
                다음
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
