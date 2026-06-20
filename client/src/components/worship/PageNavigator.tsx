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
        "absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/70 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-2xl transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="bg-slate-700 hover:bg-slate-600 text-white"
        onClick={() => onNavigate(currentPage - 1)}
        disabled={currentPage <= 0}
      >
        <ChevronLeft className="w-6 h-6" />
      </Button>
      <span className="text-white font-semibold text-lg min-w-25 text-center">
        {currentPage + 1} / {total}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="bg-slate-700 hover:bg-slate-600 text-white"
        onClick={() => onNavigate(currentPage + 1)}
        disabled={currentPage >= total - 1}
      >
        <ChevronRight className="w-6 h-6" />
      </Button>
    </div>
  );
}

export default memo(PageNavigator);
