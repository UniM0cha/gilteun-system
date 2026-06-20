import { memo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Command } from "@/types";
import { panelTransition, panelContentTransition } from "./panelMotion";

interface CommandPanelProps {
  show: boolean;
  width: string;
  reducedMotion: boolean;
  commands: Command[];
  onSendCommand: (command: Command) => void;
}

// 우측 명령 전송 패널 (슬라이드 인/아웃).
function CommandPanel({ show, width, reducedMotion, commands, onSendCommand }: CommandPanelProps) {
  return (
    <motion.aside
      aria-hidden={!show}
      inert={!show}
      initial={false}
      animate={show ? { width, opacity: 1, x: 0 } : { width: "0rem", opacity: 0, x: 12 }}
      transition={reducedMotion ? { duration: 0 } : panelTransition}
      className={cn("shrink-0 bg-slate-800 overflow-hidden", show && "border-l border-slate-700")}
      style={{ pointerEvents: show ? "auto" : "none" }}
    >
      <motion.div
        animate={show ? { opacity: 1, x: 0 } : { opacity: 0, x: 8 }}
        transition={reducedMotion ? { duration: 0 } : panelContentTransition}
        className="h-full overflow-y-auto p-4 box-border"
        style={{ width }}
      >
        <h2 className="text-lg font-bold text-white mb-4">명령 전송</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {commands.map((command) => (
            <button
              key={command.id}
              onClick={() => onSendCommand(command)}
              className="flex flex-col items-center gap-2 p-6 bg-slate-700 hover:bg-slate-600 rounded-2xl transition-all active:scale-95 group"
            >
              <span className="text-5xl group-hover:scale-110 transition-transform">{command.emoji}</span>
              <span className="text-sm font-semibold text-slate-300 text-center">{command.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.aside>
  );
}

export default memo(CommandPanel);
