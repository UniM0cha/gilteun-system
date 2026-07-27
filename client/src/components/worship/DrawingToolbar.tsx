import { memo, type Dispatch, type SetStateAction } from "react";
import {
  Pencil,
  Highlighter,
  Eye,
  Eraser,
  Undo,
  Redo,
  Minus,
  Plus as PlusIcon,
  Trash,
  Megaphone,
  Palette,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EraserType } from "@/components/SheetCanvas";
import type { PanelSide } from "@/store/deviceSettingsStore";

export interface DrawingToolState {
  isDrawMode: boolean;
  selectedColor: string;
  penWidth: number;
  isHighlighter: boolean;
  highlighterColor: string;
  highlighterWidth: number;
  eraserType: EraserType;
  eraserWidth: number;
  toolPopoverOpen: boolean;
  penOnly: boolean;
}

export interface DrawingToolActions {
  setIsDrawMode: (v: boolean) => void;
  setSelectedColor: (v: string) => void;
  setPenWidth: Dispatch<SetStateAction<number>>;
  setIsHighlighter: (v: boolean) => void;
  setHighlighterColor: (v: string) => void;
  setHighlighterWidth: Dispatch<SetStateAction<number>>;
  setEraserType: Dispatch<SetStateAction<EraserType>>;
  setEraserWidth: Dispatch<SetStateAction<number>>;
  setToolPopoverOpen: (v: boolean) => void;
  setPenOnly: (v: boolean) => void;
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
  highlighterColors: PenColor[];
  onToggleCommandPanel: () => void;
  onSpotlightCall: () => void;
  commandPanelSide: PanelSide;
}

// 도구 바 (컴팩트 시 세로 콜랩스 + 페이드). 모드 전환·도구 팝오버·실행취소·호출·명령 패널 토글.
function DrawingToolbar({
  isCompact,
  tool,
  actions,
  hasSheet,
  showCommandPanel,
  penColors,
  highlighterColors,
  onToggleCommandPanel,
  onSpotlightCall,
  commandPanelSide,
}: DrawingToolbarProps) {
  const {
    isDrawMode,
    selectedColor,
    penWidth,
    isHighlighter,
    highlighterColor,
    highlighterWidth,
    eraserType,
    eraserWidth,
    toolPopoverOpen,
    penOnly,
  } = tool;
  const {
    setIsDrawMode,
    setSelectedColor,
    setPenWidth,
    setIsHighlighter,
    setHighlighterColor,
    setHighlighterWidth,
    setEraserType,
    setEraserWidth,
    setToolPopoverOpen,
    setPenOnly,
    undo,
    redo,
    setIsCompact,
  } = actions;

  // 그리기 도구가 펜/형광펜인지(지우개가 아닐 때만 색·굵기 활성 표시)
  const isPenActive = !isHighlighter && eraserType === "none";
  const isHighlighterActive = isHighlighter && eraserType === "none";

  // 명령 패널 토글은 패널이 나타나는 가장자리와 같은 쪽에 배치 (기기 설정으로 좌/우 스왑)
  const commandPanelButton = (
    <Button variant={showCommandPanel ? "default" : "secondary"} className="h-11" onClick={onToggleCommandPanel}>
      명령 패널
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
        <div
          className="bg-card border-b px-3 sm:px-6 py-3 flex items-center gap-2"
          style={{
            opacity: isCompact ? 0 : 1,
            transform: isCompact ? "translateY(-100%)" : "translateY(0)",
            transition: "opacity var(--dur-panel) var(--ease-out), transform var(--dur-panel) var(--ease-out)",
          }}
          inert={isCompact}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
            {commandPanelSide === "left" && commandPanelButton}
            <Button
              variant={isDrawMode ? "default" : "secondary"}
              className="h-11"
              onClick={() => {
                const next = !isDrawMode;
                setIsDrawMode(next);
                if (next) setIsCompact(false);
              }}
            >
              {isDrawMode ? (
                <>
                  <Eye />
                  그리기 종료
                </>
              ) : (
                <>
                  <Pencil />
                  그리기 시작
                </>
              )}
            </Button>

            {isDrawMode && (
              <>
                <Popover open={toolPopoverOpen} onOpenChange={setToolPopoverOpen}>
                  <PopoverTrigger render={<Button variant="secondary" className="h-11" />}>
                    <Palette />
                    도구
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="start">
                    <div className="space-y-4">
                      {/* 펜 / 형광펜 토글 */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">도구</div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={isPenActive ? "secondary" : "ghost"}
                            className="h-11 flex-1"
                            onClick={() => {
                              setIsHighlighter(false);
                              setEraserType("none");
                            }}
                          >
                            <Pencil />펜
                          </Button>
                          <Button
                            variant={isHighlighterActive ? "secondary" : "ghost"}
                            className="h-11 flex-1"
                            onClick={() => {
                              setIsHighlighter(true);
                              setEraserType("none");
                            }}
                          >
                            <Highlighter />
                            형광펜
                          </Button>
                        </div>
                      </div>

                      {/* 색상 팔레트 (도구별) */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">색상</div>
                        <div className="flex items-center gap-2">
                          {isHighlighter
                            ? highlighterColors.map((hl) => (
                                <button
                                  key={hl.value}
                                  onClick={() => {
                                    setHighlighterColor(hl.value);
                                    setEraserType("none");
                                  }}
                                  aria-label={`형광펜 색상 ${hl.value}`}
                                  className={`size-11 rounded-md transition-shadow ${hl.color} ${
                                    highlighterColor === hl.value && isHighlighterActive
                                      ? "ring-2 ring-ring ring-offset-2 ring-offset-popover"
                                      : ""
                                  }`}
                                />
                              ))
                            : penColors.map((pen) => (
                                <button
                                  key={pen.value}
                                  onClick={() => {
                                    setSelectedColor(pen.value);
                                    setEraserType("none");
                                  }}
                                  aria-label={`펜 색상 ${pen.value}`}
                                  className={`size-11 rounded-md transition-shadow ${pen.color} ${
                                    selectedColor === pen.value && isPenActive
                                      ? "ring-2 ring-ring ring-offset-2 ring-offset-popover"
                                      : ""
                                  }`}
                                />
                              ))}
                        </div>
                      </div>

                      {/* 굵기 (도구별) */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          {isHighlighter ? "형광펜 굵기" : "펜 굵기"}
                        </div>
                        <div className="flex items-center gap-2 bg-muted rounded-md px-2 py-1 w-fit">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            onClick={() =>
                              isHighlighter
                                ? setHighlighterWidth((p) => Math.max(p - 2, 8))
                                : setPenWidth((p) => Math.max(p - 1, 1))
                            }
                            title="굵기 줄이기"
                            aria-label="굵기 줄이기"
                          >
                            <Minus />
                          </Button>
                          <div className="font-medium min-w-7.5 text-center">
                            {isHighlighter ? highlighterWidth : penWidth}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            onClick={() =>
                              isHighlighter
                                ? setHighlighterWidth((p) => Math.min(p + 2, 40))
                                : setPenWidth((p) => Math.min(p + 1, 20))
                            }
                            title="굵기 늘리기"
                            aria-label="굵기 늘리기"
                          >
                            <PlusIcon />
                          </Button>
                        </div>
                      </div>

                      {/* 지우개 */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">지우개</div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={eraserType === "area" ? "secondary" : "ghost"}
                            className="h-11 flex-1"
                            onClick={() => {
                              const next = eraserType === "area" ? "none" : "area";
                              setEraserType(next);
                              if (next !== "none") setToolPopoverOpen(false);
                            }}
                          >
                            <Eraser />
                            영역
                          </Button>
                          <Button
                            variant={eraserType === "stroke" ? "secondary" : "ghost"}
                            className="h-11 flex-1"
                            onClick={() => {
                              const next = eraserType === "stroke" ? "none" : "stroke";
                              setEraserType(next);
                              if (next !== "none") setToolPopoverOpen(false);
                            }}
                          >
                            <Trash />획
                          </Button>
                        </div>
                      </div>

                      {/* 지우개 크기 (영역 선택 시) */}
                      {eraserType === "area" && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-2">지우개 크기</div>
                          <div className="flex items-center gap-2 bg-muted rounded-md px-2 py-1 w-fit">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-11"
                              onClick={() => setEraserWidth((p) => Math.max(p - 2, 5))}
                              title="지우개 크기 줄이기"
                              aria-label="지우개 크기 줄이기"
                            >
                              <Minus />
                            </Button>
                            <div className="font-medium min-w-7.5 text-center">{eraserWidth}</div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-11"
                              onClick={() => setEraserWidth((p) => Math.min(p + 2, 50))}
                              title="지우개 크기 늘리기"
                              aria-label="지우개 크기 늘리기"
                            >
                              <PlusIcon />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 실행취소/다시실행 */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">실행취소</div>
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" className="h-11 flex-1" onClick={() => undo()}>
                            <Undo />
                            되돌리기
                          </Button>
                          <Button variant="secondary" className="h-11 flex-1" onClick={() => redo()}>
                            <Redo />
                            다시실행
                          </Button>
                        </div>
                      </div>

                      {/* 펜으로만 그리기(팜 리젝션) — 기기 설정에 저장되어 다음에도 유지된다.
                          펜슬 없는 기기에서 켜면 그리기가 불가능해지므로 이 토글은 항상 노출한다.
                          다만 여기는 그리기 모드에 들어가야 닿으므로, 자동 활성화 안내가 가리키는
                          주 해제 경로는 기기 설정 페이지다(DeviceSettings.tsx). */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">입력</div>
                        <Button
                          variant={penOnly ? "secondary" : "ghost"}
                          className="h-11 w-full justify-between"
                          aria-pressed={penOnly}
                          onClick={() => setPenOnly(!penOnly)}
                        >
                          <span className="flex items-center gap-2">
                            <PenTool />
                            펜으로만 그리기
                          </span>
                          <span className="text-xs text-muted-foreground">{penOnly ? "켜짐" : "꺼짐"}</span>
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 현재 도구·색·굵기 상시 표시 (팝오버를 안 열어도 상태를 알 수 있게) */}
                {(() => {
                  const isEraser = eraserType !== "none";
                  const curColor = isHighlighter ? highlighterColor : selectedColor;
                  const curWidth = isEraser ? eraserWidth : isHighlighter ? highlighterWidth : penWidth;
                  const ToolIcon = isEraser
                    ? eraserType === "stroke"
                      ? Trash
                      : Eraser
                    : isHighlighter
                      ? Highlighter
                      : Pencil;
                  const label = isEraser
                    ? eraserType === "stroke"
                      ? "획 지우개"
                      : "영역 지우개"
                    : isHighlighter
                      ? "형광펜"
                      : "펜";
                  return (
                    <div
                      className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border bg-muted/40 px-3 text-muted-foreground"
                      aria-label={`현재 도구: ${label}, 굵기 ${curWidth}`}
                    >
                      <ToolIcon className="size-4" />
                      <span className="hidden text-sm sm:inline">{label}</span>
                      {!isEraser && (
                        <span
                          className="size-4 shrink-0 rounded-full border border-border"
                          style={{ backgroundColor: curColor }}
                        />
                      )}
                      <span className="text-sm font-medium tabular-nums text-foreground">{curWidth}</span>
                    </div>
                  );
                })()}

                <Button
                  variant="secondary"
                  size="icon"
                  className="size-11"
                  onClick={() => undo()}
                  title="되돌리기"
                  aria-label="되돌리기"
                >
                  <Undo />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-11"
                  onClick={() => redo()}
                  title="다시실행"
                  aria-label="다시실행"
                >
                  <Redo />
                </Button>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {hasSheet && (
              <Button className="h-11" onClick={onSpotlightCall} title="현재 페이지를 다른 사용자에게 호출">
                <Megaphone />
                호출
              </Button>
            )}
            {commandPanelSide === "right" && commandPanelButton}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DrawingToolbar);
