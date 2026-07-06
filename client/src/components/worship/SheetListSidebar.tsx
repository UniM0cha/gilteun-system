import { memo } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { FileMusic, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Sheet, PresenceUser } from "@/types";
import type { PanelSide } from "@/store/deviceSettingsStore";
import { panelTransition, panelContentTransition, getPanelSlideX, getPanelSideConfig } from "./panelMotion";

interface SheetListSidebarProps {
  side: PanelSide;
  show: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
  sheets: Sheet[];
  currentSheetId: string | null;
  presenceUsers: PresenceUser[];
  worshipId: string | undefined;
  onSelectPage: (index: number) => void;
}

// 악보 리스트 패널 (슬라이드 인/아웃 + 접속자 표시). 기기 설정에 따라 좌/우 어느 쪽이든 배치 가능.
// 폰(isMobile)에선 밀어내기 대신 오버레이 드로어로 동작한다.
function SheetListSidebar({
  side,
  show,
  isMobile,
  reducedMotion,
  sheets,
  currentSheetId,
  presenceUsers,
  worshipId,
  onSelectPage,
}: SheetListSidebarProps) {
  const slideX = getPanelSlideX(side, show, isMobile);
  const { edgeClass, borderClass, contentClosedX } = getPanelSideConfig(side);
  return (
    <motion.aside
      aria-hidden={!show}
      inert={!show}
      initial={false}
      animate={
        isMobile
          ? { x: slideX, width: "16rem", opacity: 1 }
          : show
            ? { width: "16rem", opacity: 1, x: 0 }
            : { width: "0rem", opacity: 0, x: slideX }
      }
      transition={reducedMotion ? { duration: 0 } : panelTransition}
      className={cn(
        "bg-viewer-panel overflow-hidden",
        isMobile
          ? cn("absolute inset-y-0 z-40 w-64 shadow-2xl border-viewer-border", edgeClass, borderClass)
          : cn("shrink-0", show && cn("border-viewer-border", borderClass)),
      )}
      style={{ pointerEvents: show ? "auto" : "none" }}
    >
      {/* 내부 콘텐츠 x는 side 규칙(getPanelSideConfig.contentClosedX 주석 참고)을 따른다. */}
      <motion.div
        animate={show ? { opacity: 1, x: 0 } : { opacity: 0, x: contentClosedX }}
        transition={reducedMotion ? { duration: 0 } : panelContentTransition}
        className="w-64 h-full overflow-y-auto p-4 box-border"
      >
        <h2 className="text-lg font-bold text-viewer-foreground mb-4">악보 목록</h2>

        {sheets.length > 0 ? (
          <div className="space-y-2">
            {sheets.map((sheet, index) => {
              const usersOnSheet = presenceUsers.filter((u) => u.sheetId === sheet.id);
              return (
                <button
                  key={sheet.id}
                  onClick={() => onSelectPage(index)}
                  className={`w-full text-left p-4 rounded-xl cursor-pointer transition-colors ${
                    currentSheetId === sheet.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-white/5 text-viewer-muted hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileMusic className="w-5 h-5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold mb-1 line-clamp-2">{sheet.title}</div>
                      <div className="text-sm opacity-75">페이지 {index + 1}</div>
                    </div>
                    {usersOnSheet.length > 0 && (
                      <div className="flex -space-x-1">
                        {usersOnSheet.slice(0, 3).map((u) => (
                          <span key={u.profileId} className="text-sm" title={`${u.name} (${u.role})`}>
                            {u.roleIcon}
                          </span>
                        ))}
                        {usersOnSheet.length > 3 && (
                          <span className="text-xs text-viewer-muted ml-1">+{usersOnSheet.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <FileMusic className="w-12 h-12 text-viewer-muted mx-auto mb-3" />
            <p className="text-viewer-muted text-sm mb-4">악보가 없습니다</p>
            <Button size="sm" asChild>
              <Link to={`/worship-edit/${worshipId}`}>
                <Edit className="w-4 h-4" />
                편집 페이지에서 추가
              </Link>
            </Button>
          </div>
        )}
      </motion.div>
    </motion.aside>
  );
}

export default memo(SheetListSidebar);
