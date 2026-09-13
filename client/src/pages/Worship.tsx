import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import { useParams, useNavigate } from "react-router";
import { LoaderCircle, Upload } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { useWorship, useCommands } from "@/hooks/queries";
import { useAppStore } from "@/store/appStore";
import { useDeviceSettingsStore, selectPenOnlyActive, type PanelSide } from "@/store/deviceSettingsStore";
import { useWorshipSocket } from "@/hooks/useWorshipSocket";
import { useWorshipRoom } from "@/hooks/useWorshipRoom";
import { useWorshipPresence } from "@/hooks/useWorshipPresence";
import SheetCanvas, { type EraserType, type RemoteInProgressPath } from "@/components/SheetCanvas";
import { useDrawingSync, type DrawingPath } from "@/hooks/useDrawingSync";
import { getSocket } from "@/hooks/useSocket";
import { useAdjacentSheetPreload } from "@/hooks/useAdjacentSheetPreload";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useRetainedSheetPages } from "@/hooks/useRetainedSheetPages";
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

// 형광펜 전용 팔레트 — 반투명(35%)에서 글자가 비쳐 보이도록 밝은 형광색만.
const highlighterColors = [
  { color: "bg-yellow-300", value: "#fde047" }, // 노랑
  { color: "bg-lime-300", value: "#bef264" }, // 연두
  { color: "bg-pink-300", value: "#f9a8d4" }, // 핑크
  { color: "bg-sky-300", value: "#7dd3fc" }, // 하늘
];

export default function Worship() {
  const { id } = useParams();
  return <WorshipViewer key={id} worshipId={id} />;
}

function WorshipViewer({ worshipId: id }: { worshipId: string | undefined }) {
  const navigate = useNavigate();
  const { data: worshipData } = useWorship(id);
  const currentProfileId = useAppStore((s) => s.currentProfileId);
  const { data: commands = [] } = useCommands(currentProfileId ?? undefined);

  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [toolPopoverOpen, setToolPopoverOpen] = useState(false);
  const isDrawModeRef = useRef(isDrawMode);
  isDrawModeRef.current = isDrawMode;
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(3);
  const [eraserType, setEraserType] = useState<EraserType>("none");
  const [eraserWidth, setEraserWidth] = useState(15);
  // 형광펜 — 펜과 색·굵기를 독립적으로 기억(별개 도구처럼 동작)
  const [isHighlighter, setIsHighlighter] = useState(false);
  const [highlighterColor, setHighlighterColor] = useState("#fde047");
  const [highlighterWidth, setHighlighterWidth] = useState(18);
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

  const [preparedTargetId, setPreparedTargetId] = useState<string | null>(null);
  const [pendingTargetId, setPendingTargetState] = useState<string | null>(null);
  const pendingTargetRef = useRef<string | null>(null);
  const setPendingTargetId = useCallback((target: string | null) => {
    pendingTargetRef.current = target;
    setPendingTargetState(target);
  }, []);
  const navigatePageRef = useRef<(page: number) => void>(() => {});
  const surfaces = useRetainedSheetPages(sheets, currentSheetId, preparedTargetId);

  const socket = getSocket();

  // Socket.IO + TanStack Query 브릿지 (sheets:updated, worship:updated, worship:deleted, commands:updated)
  useWorshipSocket(
    id,
    (updatedSheets) => {
      // A reorder/removal invalidates a gesture's page-index target.
      cancelPageMotionRef.current();
      setPreparedTargetId(null);
      setPendingTargetId(null);
      // 현재 보는 악보가 삭제되면 첫 번째로 이동
      if (currentSheetId && !updatedSheets.find((s) => s.id === currentSheetId)) {
        cancelPageMotionRef.current();
        setCurrentSheetId(updatedSheets[0]?.id || null);
        resetZoom();
      }
    },
    // 예배 자체가 삭제되면 홈으로
    () => navigate("/"),
  );

  // 드로잉 동기화 훅
  const {
    pathsBySheet,
    bulkStatus,
    loadError,
    retryLoad,
    remoteInProgress,
    emitDrawStart,
    emitDrawMove,
    emitDrawCancel,
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
    worshipId: id ?? null,
    sheets,
    // A failed first image must not prevent other pages from loading. Explicit
    // navigation can also prioritize the remaining data before the first paint.
    preloadEnabled: surfaces.firstPageReady || !!pendingTargetId || surfaces.failedIds.size > 0,
  });

  // 프로필 미선택 시 홈으로 리다이렉트
  useEffect(() => {
    if (!currentProfileId) {
      navigate("/");
    }
  }, [currentProfileId, navigate]);

  // 뷰어 "무대" 다크 테마 — html에 .dark를 걸어 body-portal되는
  // Popover/Dialog/sonner 토스트까지 다크 토큰을 적용한다 (subtree 래퍼로는 portal이 라이트로 샘)
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

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
        setPreparedTargetId(null);
        setPendingTargetId(null);
        setCurrentSheetId(sheets[index].id);
        resetZoom();
        flashNavBar();
      }
    },
    [sheets, flashNavBar, resetZoom, setPendingTargetId],
  );

  const commitSheetId = useCallback(
    (sheetId: string) => {
      const index = sheets.findIndex((sheet) => sheet.id === sheetId);
      if (index >= 0) navigatePageRef.current(index);
    },
    [sheets],
  );

  // 호출된 악보가 현재 악보에서 몇 장 떨어져 있는지 (+: 오른쪽, -: 왼쪽, null: 계산 불가)
  const getSheetOffset = useCallback(
    (sheetId: string): number | null => {
      const target = sheets.findIndex((s) => s.id === sheetId);
      if (target < 0 || currentPage < 0) return null;
      return target - currentPage;
    },
    [sheets, currentPage],
  );

  const { presenceUsers } = useWorshipPresence({
    worshipId: id,
    onSpotlightAccept: commitSheetId,
    getSheetOffset,
  });

  useAdjacentSheetPreload(sheets, currentPage);

  const shouldReduceMotion = useReducedMotion();
  const isLargeScreen = useMediaQuery("(min-width: 64rem)");
  // 폰(< md): 좌/우 패널을 밀어내기 대신 오버레이 드로어로 동작시킨다.
  const isMobile = !useMediaQuery("(min-width: 48rem)");
  const commandPanelWidth = isLargeScreen ? "20rem" : "11rem";
  // 기기 설정: 명령 패널 좌/우 위치 — 악보 목록은 항상 반대편
  const commandPanelSide = useDeviceSettingsStore((s) => s.commandPanelSide);
  const sidebarSide: PanelSide = commandPanelSide === "left" ? "right" : "left";
  // 기기 설정: 펜으로만 그리기(팜 리젝션) — 스타일러스가 처음 감지되면 자동으로 켜진다
  const penOnly = useDeviceSettingsStore(selectPenOnlyActive);
  const setPenOnly = useDeviceSettingsStore((s) => s.setPenOnly);
  const notePenDetected = useDeviceSettingsStore((s) => s.notePenDetected);

  const preparePage = useCallback(
    (page: number) => {
      const target = sheets[page];
      if (target) setPreparedTargetId(target.id);
    },
    [sheets],
  );
  const awaitPage = useCallback(
    (page: number) => {
      const target = sheets[page];
      if (!target) return;
      setPreparedTargetId(target.id);
      setPendingTargetId(target.id);
    },
    [sheets, setPendingTargetId],
  );
  const cancelPreparation = useCallback(() => setPreparedTargetId(null), []);
  const startPageDrag = useCallback(() => {
    setPendingTargetId(null);
    setPreparedTargetId(null);
    flashNavBar();
  }, [flashNavBar, setPendingTargetId]);
  const isPageReady = useCallback(
    (page: number) => {
      const target = sheets[page];
      return !!target && surfaces.readyIds.has(target.id);
    },
    [sheets, surfaces.readyIds],
  );

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
    onDragStart: startPageDrag,
    reducedMotion: !!shouldReduceMotion,
    isPageReady,
    onPreparePage: preparePage,
    onAwaitPage: awaitPage,
    onCancelPrepare: cancelPreparation,
  });

  cancelPageMotionRef.current = () => {
    cancelPageMotion();
    setPendingTargetId(null);
    setPreparedTargetId(null);
  };

  const navigatePage = useCallback(
    (page: number) => {
      setPendingTargetId(null);
      setPreparedTargetId(null);
      goToPageWithMotion(page);
    },
    [goToPageWithMotion, setPendingTargetId],
  );
  navigatePageRef.current = navigatePage;

  useEffect(() => {
    if (!pendingTargetId || pendingTargetRef.current !== pendingTargetId || !surfaces.readyIds.has(pendingTargetId))
      return;
    const page = sheets.findIndex((sheet) => sheet.id === pendingTargetId);
    setPendingTargetId(null);
    if (page >= 0) goToPageWithMotion(page);
  }, [pendingTargetId, surfaces.readyIds, sheets, goToPageWithMotion, setPendingTargetId]);

  const previewTargetSheet = activeTargetPage !== null ? sheets[activeTargetPage] : null;
  const retainedSheets = sheets.filter((sheet) => surfaces.retainedIds.includes(sheet.id));
  const loadingTargetId =
    pendingTargetId ?? (currentSheetId && !surfaces.displayedIds.has(currentSheetId) ? currentSheetId : null);
  const loadingFailed =
    !!loadingTargetId && (surfaces.failedIds.has(loadingTargetId) || !!loadError || bulkStatus === "error");

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

  // 스타일러스 최초 감지 → 펜으로만 그리기 자동 활성화. 안내는 실제로 켜진 그 1회만
  // (1회 보장은 영속되는 penDetected에서 나오므로 별도 플래그가 필요 없다).
  // 반환값은 SheetCanvas가 "지금 이 프레임부터 팜 리젝션 적용"을 판단하는 데 쓴다.
  const handlePenDetected = useCallback(() => {
    if (!notePenDetected()) return false;
    toast.info("펜이 감지되어 펜으로만 그리기를 켰습니다", {
      // 안내 경로는 기기 설정으로 잡는다 — 그리기 도구 팝오버는 그리기 모드에 들어가야
      // 열 수 있고 툴바 구성도 바뀔 수 있는 반면, 기기 설정은 홈에서 바로 닿는다
      description: "손바닥이 닿아도 그려지지 않습니다. 홈 > 기기 설정에서 끌 수 있습니다",
      duration: 6000,
    });
    return true;
  }, [notePenDetected]);

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

  // 활성 도구 기준 색·굵기 — 형광펜이면 형광 상태, 아니면 펜 상태를 SheetCanvas에 넘긴다.
  const activeColor = isHighlighter ? highlighterColor : selectedColor;
  const activeWidth = isHighlighter ? highlighterWidth : penWidth;

  const drawingTool: DrawingToolState = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  const drawingActions: DrawingToolActions = useMemo(
    () => ({
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
      undo: drawingUndo,
      redo: drawingRedo,
      setIsCompact,
    }),
    [drawingUndo, drawingRedo, setPenOnly],
  );

  // 좌/우 패널 — 기기 설정(commandPanelSide)에 따라 실제 JSX 순서를 바꿔 렌더한다.
  // CSS order 대신 DOM 순서를 바꿔야 키보드 탭·스크린리더 순서가 화면 배치와 일치한다.
  // 고정 key 덕에 side가 바뀌어도 React가 리마운트 없이 노드를 이동시킨다.
  const sheetListPanel = (
    <SheetListSidebar
      key="sheet-list-panel"
      side={sidebarSide}
      show={showSidebar}
      isMobile={isMobile}
      reducedMotion={!!shouldReduceMotion}
      sheets={sheets}
      currentSheetId={currentSheetId}
      presenceUsers={presenceUsers}
      worshipId={id}
      onSelectPage={navigatePage}
    />
  );
  const commandPanel = (
    <CommandPanel
      key="command-panel"
      side={commandPanelSide}
      show={showCommandPanel}
      isMobile={isMobile}
      width={commandPanelWidth}
      reducedMotion={!!shouldReduceMotion}
      commands={commands}
      onSendCommand={handleSendCommand}
    />
  );

  return (
    <div className="h-dvh flex flex-col bg-background">
      <WorshipHeader
        worshipTitle={worshipData?.title}
        worshipId={id}
        isCompact={isCompact}
        isConnected={isConnected}
        presenceUsers={presenceUsers}
        presencePopoverOpen={presencePopoverOpen}
        onPresencePopoverChange={setPresencePopoverOpen}
        onToggleSidebar={handleToggleSidebar}
        sidebarSide={sidebarSide}
      />

      {/* 컴팩트 모드 또는 모바일(헤더 칩 숨김): 연결 끊김 시 플로팅 인디케이터 */}
      {(isCompact || isMobile) && !isConnected && (
        <div className="absolute top-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 bg-destructive/15 border border-destructive/30 rounded-lg backdrop-blur-sm">
          <div className="size-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs font-medium text-destructive">연결 끊김</span>
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
        {commandPanelSide === "left" ? commandPanel : sheetListPanel}

        {/* 중앙 악보 뷰어 */}
        <main
          className="flex-1 flex flex-col bg-background"
          style={isDrawMode ? { touchAction: "none", overscrollBehaviorX: "none" } : undefined}
        >
          <DrawingToolbar
            isCompact={isCompact}
            tool={drawingTool}
            actions={drawingActions}
            hasSheet={!!currentSheet}
            showCommandPanel={showCommandPanel}
            penColors={penColors}
            highlighterColors={highlighterColors}
            onToggleCommandPanel={handleToggleCommandPanel}
            onSpotlightCall={handleSpotlightCall}
            commandPanelSide={commandPanelSide}
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
            {retainedSheets.map((sheet) => {
              const isCurrent = sheet.id === currentSheetId;
              const isPreview = sheet.id === previewTargetSheet?.id;
              const visible = (isCurrent || isPreview) && surfaces.displayedIds.has(sheet.id);
              return (
                <motion.div
                  key={sheet.id}
                  data-sheet-page={sheet.id}
                  data-page-active={isCurrent}
                  data-page-ready={surfaces.readyIds.has(sheet.id)}
                  className="absolute inset-0 flex items-center justify-center p-4"
                  style={{
                    x: isCurrent ? pageX : isPreview ? previewX : 0,
                    containerType: "size",
                    visibility: visible ? "visible" : "hidden",
                    pointerEvents: isCurrent ? "auto" : "none",
                  }}
                  aria-hidden={!isCurrent}
                  inert={!isCurrent}
                >
                  <div
                    className="relative bg-white rounded-lg shadow-lg overflow-hidden"
                    ref={isCurrent ? sheetContainerRef : undefined}
                    style={{
                      ...SHEET_CARD_SIZE_STYLE,
                      ...(isCurrent && scale !== 1
                        ? {
                            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
                            transformOrigin,
                          }
                        : {}),
                    }}
                  >
                    <SheetCanvas
                      sheetId={sheet.id}
                      imageUrl={sheet.imagePath ? `/uploads/${sheet.imagePath}` : null}
                      isActive={isCurrent}
                      drawingsReady={pathsBySheet.has(sheet.id)}
                      imageLoadAttempt={surfaces.imageAttempts[sheet.id] ?? 0}
                      onReadyChange={surfaces.onReadyChange}
                      onRenderMetrics={surfaces.onRenderMetrics}
                      onLoadError={surfaces.onLoadError}
                      isDrawMode={isDrawMode && !toolPopoverOpen}
                      penColor={activeColor}
                      penWidth={activeWidth}
                      isHighlighter={isHighlighter && eraserType === "none"}
                      eraserType={eraserType}
                      eraserWidth={eraserWidth}
                      paths={pathsBySheet.get(sheet.id) ?? EMPTY_PATHS}
                      remoteInProgress={isCurrent ? remoteInProgress : EMPTY_REMOTE}
                      penOnly={penOnly}
                      onPenDetected={handlePenDetected}
                      onDrawCancel={emitDrawCancel}
                      onDrawStart={emitDrawStart}
                      onDrawMove={emitDrawMove}
                      onPathAdd={addPath}
                      onPathDelete={deletePath}
                      onBatchStart={startBatch}
                      onBatchEnd={endBatch}
                      profileId={currentProfileId || ""}
                    />
                  </div>
                </motion.div>
              );
            })}
            {!currentSheet && worshipData && sheets.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Upload className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg">악보를 업로드하세요</p>
                </div>
              </div>
            )}
            {loadingTargetId && (
              <div
                className="absolute inset-x-4 top-4 z-20 flex flex-wrap items-center justify-center gap-3 rounded-lg bg-background/95 p-3 text-sm shadow-lg"
                role={loadingFailed ? "alert" : "status"}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {!loadingFailed && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                <span>{loadingFailed ? "악보를 불러오지 못했습니다" : "악보를 준비하고 있습니다"}</span>
                {loadingFailed && (
                  <button
                    className="min-h-11 px-3 underline"
                    onClick={() => {
                      surfaces.retryImage(loadingTargetId);
                      retryLoad();
                    }}
                  >
                    다시 시도
                  </button>
                )}
                {pendingTargetId && (
                  <button
                    className="min-h-11 px-3"
                    onClick={() => {
                      setPendingTargetId(null);
                      setPreparedTargetId(null);
                      cancelPageMotion();
                    }}
                  >
                    이동 취소
                  </button>
                )}
              </div>
            )}

            {/* 페이지 네비게이션 */}
            {sheets.length > 0 && (
              <PageNavigator
                visible={showNavBar}
                currentPage={currentPage}
                total={sheets.length}
                onNavigate={navigatePage}
              />
            )}
          </div>
        </main>

        {commandPanelSide === "left" ? sheetListPanel : commandPanel}
      </div>
    </div>
  );
}
