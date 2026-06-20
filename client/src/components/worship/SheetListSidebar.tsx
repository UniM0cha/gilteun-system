import { memo } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { FileMusic, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Sheet, PresenceUser } from "@/types";
import { panelTransition, panelContentTransition } from "./panelMotion";

interface SheetListSidebarProps {
  show: boolean;
  reducedMotion: boolean;
  sheets: Sheet[];
  currentSheetId: string | null;
  presenceUsers: PresenceUser[];
  worshipId: string | undefined;
  onSelectPage: (index: number) => void;
}

// 좌측 악보 리스트 (슬라이드 인/아웃 + 접속자 표시).
function SheetListSidebar({
  show,
  reducedMotion,
  sheets,
  currentSheetId,
  presenceUsers,
  worshipId,
  onSelectPage,
}: SheetListSidebarProps) {
  return (
    <motion.aside
      aria-hidden={!show}
      inert={!show}
      initial={false}
      animate={show ? { width: "16rem", opacity: 1, x: 0 } : { width: "0rem", opacity: 0, x: -12 }}
      transition={reducedMotion ? { duration: 0 } : panelTransition}
      className={cn("shrink-0 bg-slate-800 overflow-hidden", show && "border-r border-slate-700")}
      style={{ pointerEvents: show ? "auto" : "none" }}
    >
      {/* 좌측은 첫 flex 항목이라 콘텐츠가 화면 끝에 고정됨 → 내부 독립 translate를
          쓰면 프레임과 분리된 parallax로 보인다. opacity만 페이드하고 슬라이드는
          aside의 x(-12→0)에 맡겨 패널 전체가 한 덩어리로 움직이게 한다.
          (우측 패널은 콘텐츠가 움직이는 divider를 따라가 통합 슬라이드로 읽히므로 내부 x 유지) */}
      <motion.div
        animate={show ? { opacity: 1 } : { opacity: 0 }}
        transition={reducedMotion ? { duration: 0 } : panelContentTransition}
        className="w-64 h-full overflow-y-auto p-4 box-border"
      >
        <h2 className="text-lg font-bold text-white mb-4">악보 목록</h2>

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
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
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
                          <span className="text-xs text-slate-400 ml-1">+{usersOnSheet.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-700 rounded-xl">
            <FileMusic className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-4">악보가 없습니다</p>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
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
