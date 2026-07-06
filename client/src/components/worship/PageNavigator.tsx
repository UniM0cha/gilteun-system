import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PageNavigatorProps {
  visible: boolean;
  currentPage: number;
  total: number;
  onNavigate: (targetPage: number) => void;
}

// 악보 영역 하단의 페이지 이동 바 (3초 후 자동 숨김 — visible로 제어).
function PageNavigator({ visible, currentPage, total, onNavigate }: PageNavigatorProps) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-lg border bg-card/80 backdrop-blur-sm px-4 py-3 shadow-lg transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      <Button
        variant="secondary"
        size="icon"
        className="size-11"
        onClick={() => onNavigate(currentPage - 1)}
        disabled={currentPage <= 0}
        title="이전 페이지"
        aria-label="이전 페이지"
      >
        <ChevronLeft />
      </Button>
      <span className="font-medium text-lg min-w-25 text-center">
        {currentPage + 1} / {total}
      </span>
      <Button
        variant="secondary"
        size="icon"
        className="size-11"
        onClick={() => onNavigate(currentPage + 1)}
        disabled={currentPage >= total - 1}
        title="다음 페이지"
        aria-label="다음 페이지"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

export default memo(PageNavigator);
