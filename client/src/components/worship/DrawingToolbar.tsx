import { memo, type Dispatch, type SetStateAction } from "react";
import { Pencil, Eye, Eraser, Undo, Redo, Minus, Plus as PlusIcon, Trash, Megaphone, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EraserType } from "@/components/SheetCanvas";

export interface DrawingToolState {
  isDrawMode: boolean;
  selectedColor: string;
  penWidth: number;
  eraserType: EraserType;
  eraserWidth: number;
  toolPopoverOpen: boolean;
}

export interface DrawingToolActions {
  setIsDrawMode: (v: boolean) => void;
  setSelectedColor: (v: string) => void;
  setPenWidth: Dispatch<SetStateAction<number>>;
  setEraserType: Dispatch<SetStateAction<EraserType>>;
  setEraserWidth: Dispatch<SetStateAction<number>>;
  setToolPopoverOpen: (v: boolean) => void;
  undo: () => void;
  redo: () => void;
  setIsCompact: (v: boolean) => void;
}

interface PenColor {
  color: string;
  value: string;
}

interface DrawingToolbarProps {
  isCompact: boolean;
  tool: DrawingToolState;
  actions: DrawingToolActions;
  hasSheet: boolean;
  showCommandPanel: boolean;
  penColors: PenColor[];
  onToggleCommandPanel: () => void;
  onSpotlightCall: () => void;
}

// 도구 바 (컴팩트 시 세로 콜랩스 + 페이드). 모드 전환·도구 팝오버·실행취소·호출·명령 패널 토글.
function DrawingToolbar({
  isCompact,
  tool,
  actions,
  hasSheet,
  showCommandPanel,
  penColors,
  onToggleCommandPanel,
  onSpotlightCall,
}: DrawingToolbarProps) {
  const { isDrawMode, selectedColor, penWidth, eraserType, eraserWidth, toolPopoverOpen } = tool;
  const {
    setIsDrawMode,
    setSelectedColor,
    setPenWidth,
    setEraserType,
    setEraserWidth,
    setToolPopoverOpen,
    undo,
    redo,
    setIsCompact,
  } = actions;

  return (
    <div
      className="grid"
      style={{
        gridTemplateRows: isCompact ? "0fr" : "1fr",
        transition: "grid-template-rows var(--dur-panel) var(--ease-out)",
      }}
    >
      <div className="overflow-hidden">
        <div
          className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between"
          style={{
            opacity: isCompact ? 0 : 1,
            transform: isCompact ? "translateY(-100%)" : "translateY(0)",
            transition: "opacity var(--dur-panel) var(--ease-out), transform var(--dur-panel) var(--ease-out)",
          }}
          inert={isCompact}
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = !isDrawMode;
                setIsDrawMode(next);
                if (next) setIsCompact(false);
              }}
              className={cn(
                "px-5 py-2.5 rounded-xl",
                isDrawMode
                  ? "bg-green-600 text-white shadow-lg hover:bg-green-700"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600",
              )}
            >
              {isDrawMode ? (
                <>
                  <Pencil className="w-5 h-5" />
                  그리기 모드
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  보기 모드
                </>
              )}
            </Button>

            {isDrawMode && (
              <>
                <Popover open={toolPopoverOpen} onOpenChange={setToolPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-slate-700 text-slate-300 hover:bg-slate-600 px-4 py-2.5 rounded-xl"
                    >
                      <Palette className="w-5 h-5" />
                      <span className="text-sm">도구</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-slate-800 border-slate-700 p-4" align="start">
                    <div className="space-y-4">
                      {/* 색상 팔레트 */}
                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-2">색상</div>
                        <div className="flex items-center gap-2">
                          {penColors.map((pen) => (
                            <button
                              key={pen.value}
                              onClick={() => {
                                setSelectedColor(pen.value);
                                setEraserType("none");
                              }}
                              className={`w-10 h-10 rounded-lg ${pen.color} transition-transform hover:scale-110 ${
                                selectedColor === pen.value && eraserType === "none"
                                  ? `ring-4 scale-110 ${pen.value === "#ffffff" ? "ring-blue-400" : "ring-white"}`
                                  : ""
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 펜 굵기 */}
                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-2">펜 굵기</div>
                        <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2 w-fit">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="p-1 h-auto w-auto hover:bg-slate-600 text-slate-300 rounded"
                            onClick={() => setPenWidth((p) => Math.max(p - 1, 1))}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <div className="text-slate-300 font-semibold min-w-7.5 text-center">{penWidth}</div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="p-1 h-auto w-auto hover:bg-slate-600 text-slate-300 rounded"
                            onClick={() => setPenWidth((p) => Math.min(p + 1, 20))}
                          >
                            <PlusIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* 지우개 */}
                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-2">지우개</div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEraserType((p) => (p === "area" ? "none" : "area"))}
                            className={cn(
                              "px-3 py-2.5 flex-1",
                              eraserType === "area"
                                ? "bg-orange-600 text-white hover:bg-orange-700"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600",
                            )}
                          >
                            <Eraser className="w-5 h-5" />
                            <span className="text-sm">영역</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEraserType((p) => (p === "stroke" ? "none" : "stroke"))}
                            className={cn(
                              "px-3 py-2.5 flex-1",
                              eraserType === "stroke"
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600",
                            )}
                          >
                            <Trash className="w-5 h-5" />
                            <span className="text-sm">획</span>
                          </Button>
                        </div>
                      </div>

                      {/* 지우개 크기 (영역 선택 시) */}
                      {eraserType === "area" && (
                        <div>
                          <div className="text-xs font-semibold text-slate-400 mb-2">지우개 크기</div>
                          <div className="flex items-center gap-2 bg-orange-700 rounded-lg px-3 py-2 w-fit">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="p-1 h-auto w-auto hover:bg-orange-600 text-white rounded"
                              onClick={() => setEraserWidth((p) => Math.max(p - 2, 5))}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <div className="text-white font-semibold min-w-7.5 text-center">{eraserWidth}</div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="p-1 h-auto w-auto hover:bg-orange-600 text-white rounded"
                              onClick={() => setEraserWidth((p) => Math.min(p + 2, 50))}
                            >
                              <PlusIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 실행취소/다시실행 */}
                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-2">실행취소</div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 flex-1"
                            onClick={() => undo()}
                          >
                            <Undo className="w-5 h-5" />
                            <span className="text-sm">되돌리기</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 flex-1"
                            onClick={() => redo()}
                          >
                            <Redo className="w-5 h-5" />
                            <span className="text-sm">다시실행</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-2.5"
                  onClick={() => undo()}
                >
                  <Undo className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-2.5"
                  onClick={() => redo()}
                >
                  <Redo className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasSheet && (
              <Button
                size="sm"
                className="bg-amber-600 text-white hover:bg-amber-700 px-4 py-2.5 rounded-xl"
                onClick={onSpotlightCall}
                title="현재 페이지를 다른 사용자에게 호출"
              >
                <Megaphone className="w-5 h-5" />
                <span className="text-sm">호출</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCommandPanel}
              className={cn(
                "px-5 py-2.5 rounded-xl",
                showCommandPanel
                  ? "bg-purple-600 text-white shadow-lg hover:bg-purple-700"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600",
              )}
            >
              명령 패널
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DrawingToolbar);
