import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import { useParams, useNavigate } from "react-router";
import { Upload } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { useWorship, useCommands, useSheetDrawings, useAdjacentDrawingsPreload } from "@/hooks/queries";
import { useAppStore } from "@/store/appStore";
import { useWorshipSocket } from "@/hooks/useWorshipSocket";
import { useWorshipRoom } from "@/hooks/useWorshipRoom";
import { useWorshipPresence } from "@/hooks/useWorshipPresence";
import SheetCanvas, { type EraserType, type RemoteInProgressPath } from "@/components/SheetCanvas";
import { useDrawingSync, type DrawingPath } from "@/hooks/useDrawingSync";
import { getSocket } from "@/hooks/useSocket";
import { useAdjacentSheetPreload } from "@/hooks/useAdjacentSheetPreload";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSheetPageMotion } from "@/hooks/useSheetPageMotion";
import { useSheetZoomPan } from "@/hooks/useSheetZoomPan";
import WorshipHeader from "@/components/worship/WorshipHeader";
import SheetListSidebar from "@/components/worship/SheetListSidebar";
import DrawingToolbar, { type DrawingToolState, type DrawingToolActions } from "@/components/worship/DrawingToolbar";
import CommandPanel from "@/components/worship/CommandPanel";
import PageNavigator from "@/components/worship/PageNavigator";

// 악보 카드 sizing — 부모(container-type:size) 안에 항상 3:4로 contain.
// 너비 clamp로 비율이 깨지면 canvas가 비등방 stretch되어 stroke가 어긋나므로 비율을 고정한다.
// 메인·preview 카드가 동일 좌표계를 유지해야 stroke 정렬이 맞으므로 한 곳에서 관리한다.
const SHEET_CARD_SIZE_STYLE: CSSProperties = {
  aspectRatio: "3 / 4",
  height: "min(100cqh, calc(100cqw * 4 / 3))",
};

// preview SheetCanvas에 넘기는 빈 배열 — 매 렌더 새 배열 생성을 막아 불필요한 redraw 방지
const EMPTY_PATHS: DrawingPath[] = [];
const EMPTY_REMOTE: RemoteInProgressPath[] = [];

const penColors = [
  { color: "bg-red-500", value: "#ef4444" },
  { color: "bg-blue-500", value: "#3b82f6" },
  { color: "bg-green-500", value: "#22c55e" },
  { color: "bg-purple-500", value: "#a855f7" },
  { color: "bg-white border border-slate-500", value: "#ffffff" },
  { color: "bg-black", value: "#000000" },
];

export default function Worship() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: worshipData } = useWorship(id);
  const { data: commands = [] } = useCommands();
  const currentProfileId = useAppStore((s) => s.currentProfileId);

  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [toolPopoverOpen, setToolPopoverOpen] = useState(false);
  const isDrawModeRef = useRef(isDrawMode);
  isDrawModeRef.current = isDrawMode;
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(3);
  const [eraserType, setEraserType] = useState<EraserType>("none");
  const [eraserWidth, setEraserWidth] = useState(15);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCommandPanel, setShowCommandPanel] = useState(false);
  const [presencePopoverOpen, setPresencePopoverOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [showNavBar, setShowNavBar] = useState(true);
  const navBarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 핀치줌 중심점 기준이 되는 악보 카드 ref
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  // 페이지 뷰포트 ref (motion + gesture 컨테이너)
  const sheetViewportRef = useRef<HTMLDivElement>(null);
  const cancelPageMotionRef = useRef<() => void>(() => {});

  // 핀치줌/팬 제스처
  const {
    scale,
    translate,
    transformOrigin,
    handleSheetTouchStart,
    handleSheetTouchMove,
    handleSheetTouchEnd,
    isZoomActive,
    resetZoom,
  } = useSheetZoomPan({ containerRef: sheetContainerRef, isDrawModeRef, cancelPageMotionRef });

  const sheets = useMemo(() => worshipData?.sheets || [], [worshipData?.sheets]);
  const currentSheet = useMemo(() => sheets.find((s) => s.id === currentSheetId) || null, [sheets, currentSheetId]);
  const currentPage = sheets.findIndex((s) => s.id === currentSheetId);

  const socket = getSocket();

  // Socket.IO + TanStack Query 브릿지 (sheets:updated, worship:updated)
  useWorshipSocket(id, (updatedSheets) => {
    // 현재 보는 악보가 삭제되면 첫 번째로 이동
    if (currentSheetId && !updatedSheets.find((s) => s.id === currentSheetId)) {
      cancelPageMotionRef.current();
      setCurrentSheetId(updatedSheets[0]?.id || null);
      resetZoom();
    }
  });

  // 드로잉 동기화 훅
  const {
    paths: drawingPaths,
    remoteInProgress,
    emitDrawStart,
    emitDrawMove,
    addPath,
    deletePath,
    startBatch,
    endBatch,
    undo: drawingUndo,
    redo: drawingRedo,
  } = useDrawingSync({
    sheetId: currentSheetId,
    profileId: currentProfileId,
    enabled: !!id,
  });

  // 프로필 미선택 시 홈으로 리다이렉트
  useEffect(() => {
    if (!currentProfileId) {
      navigate("/");
    }
  }, [currentProfileId, navigate]);

  // worshipData 로드 시 첫 번째 시트 선택
  useEffect(() => {
    if (worshipData && worshipData.sheets.length > 0 && !currentSheetId) {
      setCurrentSheetId(worshipData.sheets[0].id);
    }
  }, [worshipData, currentSheetId]);

  const { isConnected } = useWorshipRoom({
    worshipId: id,
    profileId: currentProfileId,
    currentSheetId,
  });

  // 네비게이션 바 자동 숨김 (5초)
  const flashNavBar = useCallback(() => {
    setShowNavBar(true);
    if (navBarTimerRef.current) clearTimeout(navBarTimerRef.current);
    navBarTimerRef.current = setTimeout(() => setShowNavBar(false), 3000);
  }, []);

  // 최초 로드 및 시트 변경 시 네비 바 표시
  useEffect(() => {
    if (currentSheetId) {
      flashNavBar();
    }
  }, [currentSheetId, flashNavBar]);

  // 클린업
  useEffect(() => {
    return () => {
      if (navBarTimerRef.current) clearTimeout(navBarTimerRef.current);
    };
  }, []);

  const commitPage = useCallback(
    (index: number) => {
      if (index >= 0 && index < sheets.length) {
        cancelPageMotionRef.current();
        setCurrentSheetId(sheets[index].id);
        resetZoom();
        flashNavBar();
      }
    },
    [sheets, flashNavBar, resetZoom],
  );

  const commitSheetId = useCallback(
    (sheetId: string) => {
      const index = sheets.findIndex((sheet) => sheet.id === sheetId);
      if (index >= 0) commitPage(index);
    },
    [sheets, commitPage],
  );

  const { presenceUsers } = useWorshipPresence({ worshipId: id, onSpotlightAccept: commitSheetId });

  useAdjacentSheetPreload(sheets, currentPage);
  useAdjacentDrawingsPreload(sheets, currentPage);

  const shouldReduceMotion = useReducedMotion();
  const isLargeScreen = useMediaQuery("(min-width: 64rem)");
  // 폰(< md): 좌/우 패널을 밀어내기 대신 오버레이 드로어로 동작시킨다.
  const isMobile = !useMediaQuery("(min-width: 48rem)");
  const commandPanelWidth = isLargeScreen ? "20rem" : "11rem";

  const {
    x: pageX,
    previewX,
    activeTargetPage,
    suppressNextClickRef,
    bindPageDrag,
    goToPageWithMotion,
    cancelPageMotion,
  } = useSheetPageMotion({
    currentPage,
    pageCount: sheets.length,
    containerRef: sheetViewportRef,
    enabled: !!currentSheet && !toolPopoverOpen,
    isBlocked: () => isDrawModeRef.current || isZoomActive(),
    onCommitPage: commitPage,
    onDragStart: flashNavBar,
    reducedMotion: !!shouldReduceMotion,
  });

  cancelPageMotionRef.current = cancelPageMotion;

  // 전환 미리보기에 들어올 대상 시트의 stroke (프리페치돼 있으면 즉시 캐시 반환)
  const previewTargetSheet = activeTargetPage !== null ? sheets[activeTargetPage] : null;
  const { data: previewDrawings } = useSheetDrawings(previewTargetSheet?.id ?? null);

  const handleSendCommand = useCallback(
    (command: { id: string; emoji: string; label: string }) => {
      if (!id || !currentProfileId) return;
      socket.emit("command:send", {
        worshipId: id,
        commandId: command.id,
        profileId: currentProfileId,
      });
    },
    [id, currentProfileId, socket],
  );

  const handleSpotlightCall = useCallback(() => {
    if (!id || !currentProfileId || !currentSheet) return;
    socket.emit("page:spotlight", {
      worshipId: id,
      sheetId: currentSheet.id,
      sheetTitle: currentSheet.title,
      profileId: currentProfileId,
    });
    toast.success("현재 페이지를 호출했습니다");
  }, [id, currentProfileId, currentSheet, socket]);

  // 모바일에선 한 쪽 드로어만 — 하나를 열면 다른 하나를 닫는다.
  const handleToggleSidebar = useCallback(() => {
    setShowSidebar((s) => {
      const next = !s;
      if (next && isMobile) setShowCommandPanel(false);
      return next;
    });
  }, [isMobile]);
  const handleToggleCommandPanel = useCallback(() => {
    setShowCommandPanel((s) => {
      const next = !s;
      if (next && isMobile) setShowSidebar(false);
      return next;
    });
  }, [isMobile]);

  const drawingTool: DrawingToolState = useMemo(
    () => ({ isDrawMode, selectedColor, penWidth, eraserType, eraserWidth, toolPopoverOpen }),
    [isDrawMode, selectedColor, penWidth, eraserType, eraserWidth, toolPopoverOpen],
  );

  const drawingActions: DrawingToolActions = useMemo(
    () => ({
      setIsDrawMode,
      setSelectedColor,
      setPenWidth,
      setEraserType,
      setEraserWidth,
      setToolPopoverOpen,
      undo: drawingUndo,
      redo: drawingRedo,
      setIsCompact,
    }),
    [drawingUndo, drawingRedo],
  );

  return (
    <div className="h-dvh flex flex-col bg-viewer-bg">
      <WorshipHeader
        worshipTitle={worshipData?.title}
        worshipId={id}
        isCompact={isCompact}
        isConnected={isConnected}
        presenceUsers={presenceUsers}
        presencePopoverOpen={presencePopoverOpen}
        onPresencePopoverChange={setPresencePopoverOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* 컴팩트 모드 또는 모바일(헤더 칩 숨김): 연결 끊김 시 플로팅 인디케이터 */}
      {(isCompact || isMobile) && !isConnected && (
        <div className="absolute top-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-400">연결 끊김</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* 모바일: 패널 열림 시 배경을 탭하면 닫힘 */}
        {isMobile && (showSidebar || showCommandPanel) && (
          <div
            className="absolute inset-0 z-30 bg-black/40"
            onClick={() => {
              setShowSidebar(false);
              setShowCommandPanel(false);
            }}
          />
        )}
        <SheetListSidebar
          show={showSidebar}
          isMobile={isMobile}
          reducedMotion={!!shouldReduceMotion}
          sheets={sheets}
          currentSheetId={currentSheetId}
          presenceUsers={presenceUsers}
          worshipId={id}
          onSelectPage={commitPage}
        />

        {/* 중앙 악보 뷰어 */}
        <main
          className="flex-1 flex flex-col bg-viewer-bg"
          style={isDrawMode ? { touchAction: "none", overscrollBehaviorX: "none" } : undefined}
        >
          <DrawingToolbar
            isCompact={isCompact}
            tool={drawingTool}
            actions={drawingActions}
            hasSheet={!!currentSheet}
            showCommandPanel={showCommandPanel}
            penColors={penColors}
            onToggleCommandPanel={handleToggleCommandPanel}
            onSpotlightCall={handleSpotlightCall}
          />

          {/* 악보 영역 */}
          <div
            ref={sheetViewportRef}
            className="flex-1 relative overflow-hidden"
            style={{ touchAction: "none" }}
            onClick={() => {
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false;
                return;
              }
              if (!isDrawMode) {
                setIsCompact((prev) => !prev);
                // 탭 시 presence popover를 명시적으로 닫음 — open prop만 gating하면
                // 다시 펼칠 때 presencePopoverOpen=true가 남아 메뉴가 되살아남
                setPresencePopoverOpen(false);
                flashNavBar();
              }
            }}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
            {...bindPageDrag()}
          >
            <motion.div
              className="absolute inset-0 flex items-center justify-center p-4"
              style={{ x: pageX, containerType: "size" }}
            >
              <div
                className="relative bg-white rounded-2xl shadow-2xl overflow-hidden"
                ref={sheetContainerRef}
                style={{
                  ...SHEET_CARD_SIZE_STYLE,
                  ...(scale !== 1
                    ? {
                        transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
                        transformOrigin,
                      }
                    : {}),
                }}
              >
                {currentSheet ? (
                  <SheetCanvas
                    sheetId={currentSheet.id}
                    imageUrl={currentSheet.imagePath ? `/uploads/${currentSheet.imagePath}` : null}
                    isDrawMode={isDrawMode && !toolPopoverOpen}
                    penColor={selectedColor}
                    penWidth={penWidth}
                    eraserType={eraserType}
                    eraserWidth={eraserWidth}
                    paths={drawingPaths}
                    remoteInProgress={remoteInProgress}
                    onDrawStart={emitDrawStart}
                    onDrawMove={emitDrawMove}
                    onPathAdd={addPath}
                    onPathDelete={deletePath}
                    onBatchStart={startBatch}
                    onBatchEnd={endBatch}
                    profileId={currentProfileId || ""}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg">악보를 업로드하세요</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {previewTargetSheet && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none"
                style={{ x: previewX, containerType: "size" }}
                aria-hidden="true"
              >
                {/* 메인 카드와 동일 좌표계 유지 위해 동일 sizing 상수 사용 */}
                <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden" style={SHEET_CARD_SIZE_STYLE}>
                  {/* 읽기 전용 SheetCanvas — 미리 받아둔 stroke를 메인과 동일 좌표계로 렌더 */}
                  <SheetCanvas
                    sheetId={previewTargetSheet.id}
                    imageUrl={previewTargetSheet.imagePath ? `/uploads/${previewTargetSheet.imagePath}` : null}
                    isDrawMode={false}
                    penColor={selectedColor}
                    penWidth={penWidth}
                    eraserType="none"
                    eraserWidth={eraserWidth}
                    paths={previewDrawings ?? EMPTY_PATHS}
                    remoteInProgress={EMPTY_REMOTE}
                    profileId={currentProfileId || ""}
                  />
                </div>
              </motion.div>
            )}

            {/* 페이지 네비게이션 */}
            {sheets.length > 0 && (
              <PageNavigator
                visible={showNavBar}
                currentPage={currentPage}
                total={sheets.length}
                onNavigate={goToPageWithMotion}
              />
            )}
          </div>
        </main>

        <CommandPanel
          show={showCommandPanel}
          isMobile={isMobile}
          width={commandPanelWidth}
          reducedMotion={!!shouldReduceMotion}
          commands={commands}
          onSendCommand={handleSendCommand}
        />
      </div>
    </div>
  );
}
