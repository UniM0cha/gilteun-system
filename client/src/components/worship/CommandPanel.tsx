import { memo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Command } from "@/types";
import { panelTransition, panelContentTransition } from "./panelMotion";

interface CommandPanelProps {
  show: boolean;
  isMobile: boolean;
  width: string;
  reducedMotion: boolean;
  commands: Command[];
  onSendCommand: (command: Command) => void;
}

// 우측 명령 전송 패널 (슬라이드 인/아웃).
// 폰(isMobile)에선 밀어내기 대신 우측 오버레이 드로어로 동작한다.
function CommandPanel({ show, isMobile, width, reducedMotion, commands, onSendCommand }: CommandPanelProps) {
  const drawerWidth = isMobile ? "18rem" : width;
  return (
    <motion.aside
      aria-hidden={!show}
      inert={!show}
      initial={false}
      animate={
        isMobile
          ? { x: show ? 0 : "100%", width: "18rem", opacity: 1 }
          : show
            ? { width, opacity: 1, x: 0 }
            : { width: "0rem", opacity: 0, x: 12 }
      }
      transition={reducedMotion ? { duration: 0 } : panelTransition}
      className={cn(
        "bg-viewer-panel overflow-hidden",
        isMobile
          ? "absolute inset-y-0 right-0 z-40 w-72 border-l border-viewer-border shadow-2xl"
          : cn("shrink-0", show && "border-l border-viewer-border"),
      )}
      style={{ pointerEvents: show ? "auto" : "none" }}
    >
      <motion.div
        animate={show ? { opacity: 1, x: 0 } : { opacity: 0, x: 8 }}
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
