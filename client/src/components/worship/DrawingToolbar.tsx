import { memo, type Dispatch, type SetStateAction } from "react";
import { Pencil, Highlighter, Eye, Eraser, Undo, Redo, Minus, Plus as PlusIcon, Trash, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
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
    undo,
    redo,
    setIsCompact,
  } = actions;

  // 그리기 도구가 펜/형광펜인지(지우개가 아닐 때만 색·굵기 활성 표시)
  const isEraser = eraserType !== "none";
  const isPenActive = !isHighlighter && !isEraser;
  const isHighlighterActive = isHighlighter && !isEraser;

  // 팔레트 트리거에 현재 도구·색·굵기를 그대로 표시 (팝오버를 안 열어도 상태를 알 수 있게)
  // 획 지우개는 굵기 개념이 없어 null로 둔다 — 삭제 판정은 SheetCanvas가 고정 threshold(20)와
  // 대상 획의 굵기로만 하고(findPathAtPoint), 팔레트의 "지우개 크기"도 영역 지우개 전용이라
  // 사용자가 바꿀 수도 없는 숫자를 트리거에 띄우게 된다.
  const activeColor = isHighlighter ? highlighterColor : selectedColor;
  const activeWidth =
    eraserType === "stroke" ? null : isEraser ? eraserWidth : isHighlighter ? highlighterWidth : penWidth;
  const ActiveToolIcon = isEraser ? (eraserType === "stroke" ? Trash : Eraser) : isHighlighter ? Highlighter : Pencil;
  const activeToolLabel = isEraser
    ? eraserType === "stroke"
      ? "획 지우개"
      : "영역 지우개"
    : isHighlighter
      ? "형광펜"
      : "펜";

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
                  <PopoverTrigger
                    render={<Button variant="secondary" className="h-11" />}
                    title="도구 설정"
                    aria-label={`도구 설정 (현재 ${activeToolLabel}${activeWidth === null ? "" : `, 굵기 ${activeWidth}`})`}
                  >
                    <ActiveToolIcon />
                    <span>{activeToolLabel}</span>
                    {!isEraser && (
                      <span
                        className="size-4 shrink-0 rounded-full border border-border"
                        style={{ backgroundColor: activeColor }}
                      />
                    )}
                    {activeWidth !== null && <span className="tabular-nums">{activeWidth}</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="start">
                    {/* 팝오버(role=dialog) 접근성 이름. 내부 섹션 라벨("도구"·"색상"…)과 중복 노출되지
                        않도록 sr-only로 둔다. */}
                    <PopoverTitle className="sr-only">그리기 도구</PopoverTitle>
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
                    </div>
                  </PopoverContent>
                </Popover>

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
