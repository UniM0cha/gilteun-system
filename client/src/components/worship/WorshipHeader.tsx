import { memo } from "react";
import { Link } from "react-router";
import { ArrowLeft, Menu, Edit, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PresenceUser } from "@/types";
import type { PanelSide } from "@/store/deviceSettingsStore";

interface WorshipHeaderProps {
  worshipTitle: string | undefined;
  worshipId: string | undefined;
  isCompact: boolean;
  isConnected: boolean;
  presenceUsers: PresenceUser[];
  presencePopoverOpen: boolean;
  onPresencePopoverChange: (open: boolean) => void;
  onToggleSidebar: () => void;
  sidebarSide: PanelSide;
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
  sidebarSide,
}: WorshipHeaderProps) {
  // 악보 목록 토글은 패널이 나타나는 가장자리와 같은 쪽에 배치 (기기 설정으로 좌/우 스왑)
  const sidebarToggleButton = (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 shrink-0 text-muted-foreground"
      onClick={onToggleSidebar}
      title="악보 목록"
      aria-label="악보 목록 열기"
    >
      <Menu />
    </Button>
  );
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
          className="bg-card border-b px-3 sm:px-6 py-4 flex items-center justify-between gap-2"
          style={{
            opacity: isCompact ? 0 : 1,
            transform: isCompact ? "translateY(-100%)" : "translateY(0)",
            transition: "opacity var(--dur-panel) var(--ease-out), transform var(--dur-panel) var(--ease-out)",
          }}
          inert={isCompact}
        >
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              to="/worship-list"
              title="예배 목록으로"
              aria-label="예배 목록으로"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-11 shrink-0 text-muted-foreground",
              )}
            >
              <ArrowLeft />
            </Link>
            {sidebarSide === "left" && sidebarToggleButton}
            <div className="h-8 w-px bg-border shrink-0" />
            <h1 className="text-base sm:text-xl font-semibold truncate">{worshipTitle || "예배"}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* 서버 연결 상태 인디케이터 (좁은 폭에선 숨김 → 플로팅 인디케이터로 대체) */}
            {!isConnected && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-destructive/15 border border-destructive/30 rounded-lg">
                <div className="size-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-medium text-destructive">연결 끊김</span>
              </div>
            )}
            <Link
              to={`/worship-edit/${worshipId}`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-11 text-muted-foreground")}
            >
              <Edit />
              <span className="hidden sm:inline">편집</span>
            </Link>
            {/* 컴팩트 시 헤더가 접히면 포털된 PopoverContent도 함께 닫음(inert는 포털 밖을 못 막음) */}
            <Popover open={presencePopoverOpen && !isCompact} onOpenChange={onPresencePopoverChange}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 text-muted-foreground cursor-pointer"
                    aria-label={`${presenceUsers.length}명 접속`}
                  />
                }
              >
                <Users />
                {/* 좁은 폭에선 숫자만 (편집 버튼의 hidden sm:inline 축약 패턴과 동일) */}
                <span className="hidden sm:inline">{presenceUsers.length}명 접속</span>
                <span className="sm:hidden">{presenceUsers.length}</span>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <div className="p-3 border-b">
                  <h3 className="text-sm font-semibold">접속 중인 사용자</h3>
                </div>
                <div className="p-2 max-h-60 overflow-y-auto">
                  {presenceUsers.map((user) => (
                    <div key={user.profileId} className="flex items-center gap-3 px-2 py-2 rounded-md">
                      <span className="text-lg">{user.roleIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {sidebarSide === "right" && sidebarToggleButton}
          </div>
        </header>
      </div>
    </div>
  );
}

export default memo(WorshipHeader);
