import { memo } from "react";
import { Link } from "react-router";
import { ArrowLeft, Menu, Edit, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PresenceUser } from "@/types";

interface WorshipHeaderProps {
  worshipTitle: string | undefined;
  worshipId: string | undefined;
  isCompact: boolean;
  isConnected: boolean;
  presenceUsers: PresenceUser[];
  presencePopoverOpen: boolean;
  onPresencePopoverChange: (open: boolean) => void;
  onToggleSidebar: () => void;
}

// 상단 헤더 (컴팩트 시 세로 콜랩스 + 페이드 — 찌그러짐 없는 push).
function WorshipHeader({
  worshipTitle,
  worshipId,
  isCompact,
  isConnected,
  presenceUsers,
  presencePopoverOpen,
  onPresencePopoverChange,
  onToggleSidebar,
}: WorshipHeaderProps) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateRows: isCompact ? "0fr" : "1fr",
        transition: "grid-template-rows var(--dur-panel) var(--ease-out)",
      }}
    >
      <div className="overflow-hidden">
        <header
          className="bg-viewer-panel border-b border-viewer-border px-3 sm:px-6 py-4 flex items-center justify-between gap-2"
          style={{
            opacity: isCompact ? 0 : 1,
            transform: isCompact ? "translateY(-100%)" : "translateY(0)",
            transition: "opacity var(--dur-panel) var(--ease-out), transform var(--dur-panel) var(--ease-out)",
          }}
          inert={isCompact}
        >
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" className="hover:bg-white/10 text-viewer-muted shrink-0" asChild>
              <Link to="/worship-list">
                <ArrowLeft className="w-6 h-6" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/10 text-viewer-muted shrink-0"
              onClick={onToggleSidebar}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="h-8 w-px bg-viewer-border shrink-0" />
            <h1 className="text-base sm:text-xl font-bold text-viewer-foreground truncate">{worshipTitle || "예배"}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* 서버 연결 상태 인디케이터 (좁은 폭에선 숨김 → 플로팅 인디케이터로 대체) */}
            {!isConnected && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-red-400">연결 끊김</span>
              </div>
            )}
            <Button variant="ghost" size="sm" className="bg-white/5 text-viewer-muted hover:bg-white/10" asChild>
              <Link to={`/worship-edit/${worshipId}`}>
                <Edit className="w-5 h-5" />
                <span className="hidden sm:inline">편집</span>
              </Link>
            </Button>
            {/* 컴팩트 시 헤더가 접히면 포털된 PopoverContent도 함께 닫음(inert는 포털 밖을 못 막음) */}
            <Popover open={presencePopoverOpen && !isCompact} onOpenChange={onPresencePopoverChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-white/5 text-viewer-muted hover:bg-white/10 cursor-pointer"
                >
                  <Users className="w-5 h-5" />
                  <span>{presenceUsers.length}명 접속</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-viewer-panel border-viewer-border p-0" align="end">
                <div className="p-3 border-b border-viewer-border">
                  <h3 className="text-sm font-semibold text-viewer-foreground">접속 중인 사용자</h3>
                </div>
                <div className="p-2 max-h-60 overflow-y-auto">
                  {presenceUsers.map((user) => (
                    <div key={user.profileId} className="flex items-center gap-3 px-2 py-2 rounded-lg">
                      <span className="text-lg">{user.roleIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-viewer-foreground truncate">{user.name}</div>
                        <div className="text-xs text-viewer-muted">{user.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>
      </div>
    </div>
  );
}

export default memo(WorshipHeader);
