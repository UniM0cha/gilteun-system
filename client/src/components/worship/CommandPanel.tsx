import { memo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Command } from "@/types";
import type { PanelSide } from "@/store/deviceSettingsStore";
import { panelTransition, panelContentTransition, getPanelSlideX, getPanelSideConfig } from "./panelMotion";

interface CommandPanelProps {
  side: PanelSide;
  show: boolean;
  isMobile: boolean;
  width: string;
  reducedMotion: boolean;
  commands: Command[];
  onSendCommand: (command: Command) => void;
}

// 명령 전송 패널 (슬라이드 인/아웃). 기기 설정에 따라 좌/우 어느 쪽이든 배치 가능.
// 폰(isMobile)에선 밀어내기 대신 오버레이 드로어로 동작한다.
function CommandPanel({ side, show, isMobile, width, reducedMotion, commands, onSendCommand }: CommandPanelProps) {
  const drawerWidth = isMobile ? "18rem" : width;
  const slideX = getPanelSlideX(side, show, isMobile);
  const { edgeClass, borderClass, contentClosedX } = getPanelSideConfig(side);
  return (
    <motion.aside
      aria-hidden={!show}
      inert={!show}
      initial={false}
      animate={
        isMobile
          ? { x: slideX, width: "18rem", opacity: 1 }
          : show
            ? { width, opacity: 1, x: 0 }
            : { width: "0rem", opacity: 0, x: slideX }
      }
      transition={reducedMotion ? { duration: 0 } : panelTransition}
      className={cn(
        "bg-viewer-panel overflow-hidden",
        isMobile
          ? cn("absolute inset-y-0 z-40 w-72 shadow-2xl border-viewer-border", edgeClass, borderClass)
          : cn("shrink-0", show && cn("border-viewer-border", borderClass)),
      )}
      style={{ pointerEvents: show ? "auto" : "none" }}
    >
      {/* 내부 콘텐츠 x는 side 규칙(getPanelSideConfig.contentClosedX 주석 참고)을 따른다. */}
      <motion.div
        animate={show ? { opacity: 1, x: 0 } : { opacity: 0, x: contentClosedX }}
        transition={reducedMotion ? { duration: 0 } : panelContentTransition}
        className="h-full overflow-y-auto p-4 box-border"
        style={{ width: drawerWidth }}
      >
        <h2 className="text-lg font-bold text-viewer-foreground mb-4">명령 전송</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {commands.map((command) => (
            <button
              key={command.id}
              onClick={() => onSendCommand(command)}
              className="flex flex-col items-center gap-2 p-6 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95 group"
            >
              <span className="text-5xl group-hover:scale-110 transition-transform">{command.emoji}</span>
              <span className="text-sm font-semibold text-viewer-muted text-center">{command.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.aside>
  );
}

export default memo(CommandPanel);
