import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Eye,
  Eraser,
  Undo,
  Redo,
  ArrowLeft,
  Users,
  Menu,
  Minus,
  Plus as PlusIcon,
  Edit,
  Trash,
  FileMusic,
  Upload,
  Megaphone,
  Palette,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

const PANEL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const panelTransition = { duration: 0.22, ease: PANEL_EASE };
const panelContentTransition = { duration: 0.16, ease: PANEL_EASE };

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

  // 핀치줌 상태
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [transformOrigin, setTransformOrigin] = useState("center center");
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  scaleRef.current = scale;
  const pinchRef = useRef<{
    startDist: number;
    startScale: number;
    startCenter: { x: number; y: number };
    startTranslate: { x: number; y: number };
  } | null>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    startTranslate: { x: number; y: number };
  } | null>(null);
  const lastTapRef = useRef(0);

  const sheets = useMemo(() => worshipData?.sheets || [], [worshipData?.sheets]);
  const currentSheet = sheets.find((s) => s.id === currentSheetId) || null;
  const currentPage = sheets.findIndex((s) => s.id === currentSheetId);

  // 페이지 뷰포트 ref (motion + gesture 컨테이너)
  const sheetViewportRef = useRef<HTMLDivElement>(null);

  const cancelPageMotionRef = useRef<() => void>(() => {});

  const socket = getSocket();

  // Socket.IO + TanStack Query 브릿지 (sheets:updated, worship:updated)
  useWorshipSocket(id, (updatedSheets) => {
    // 현재 보는 악보가 삭제되면 첫 번째로 이동
    if (currentSheetId && !updatedSheets.find((s) => s.id === currentSheetId)) {
      cancelPageMotionRef.current();
      setCurrentSheetId(updatedSheets[0]?.id || null);
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      setTransformOrigin("center center");
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
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        setTransformOrigin("center center");
        flashNavBar();
      }
    },
    [sheets, flashNavBar],
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
    isBlocked: () => isDrawModeRef.current || scaleRef.current > 1 || !!pinchRef.current || !!panRef.current,
    onCommitPage: commitPage,
    onDragStart: flashNavBar,
    reducedMotion: !!shouldReduceMotion,
  });

  cancelPageMotionRef.current = cancelPageMotion;

  // 전환 미리보기에 들어올 대상 시트의 stroke (프리페치돼 있으면 즉시 캐시 반환)
  const previewTargetSheet = activeTargetPage !== null ? sheets[activeTargetPage] : null;
  const { data: previewDrawings } = useSheetDrawings(previewTargetSheet?.id ?? null);

  // 핀치줌 유틸
  const parseOriginPercent = (origin: string): [number, number] => {
    if (origin === "center center") return [50, 50];
    const parts = origin.split(/\s+/);
    return [parseFloat(parts[0]), parseFloat(parts[1])];
  };

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  });

  // 핀치줌 핸들러 (악보 영역)
  const handleSheetTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // 진행 중인 page drag/animation 즉시 취소 (pinch 우선)
        cancelPageMotion();
        // 핀치 시작
        const dist = getTouchDistance(e.touches);
        const center = getTouchCenter(e.touches);
        panRef.current = null;

        // 핀치 중심점을 transformOrigin으로 설정
        // scale > 1이면 origin 변경에 따른 translate 보정으로 위치 점프 방지
        let currentTranslate = { ...translate };
        const container = sheetContainerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const newRelX = ((center.x - rect.left) / rect.width) * 100;
          const newRelY = ((center.y - rect.top) / rect.height) * 100;

          if (scaleRef.current > 1) {
            const [oldRelX, oldRelY] = parseOriginPercent(transformOrigin);
            const s = scaleRef.current;
            // rect는 렌더링 크기(CSS너비×scale)이므로 /s로 CSS 원본 너비 복원
            const cssWidth = rect.width / s;
            const cssHeight = rect.height / s;
            currentTranslate = {
              x: translate.x + ((oldRelX - newRelX) / 100) * cssWidth * (1 - s),
              y: translate.y + ((oldRelY - newRelY) / 100) * cssHeight * (1 - s),
            };
            setTranslate(currentTranslate);
          }

          setTransformOrigin(`${newRelX}% ${newRelY}%`);
        }

        pinchRef.current = {
          startDist: dist,
          startScale: scaleRef.current,
          startCenter: center,
          startTranslate: currentTranslate,
        };

        e.preventDefault();
      } else if (e.touches.length === 1) {
        // 더블탭 감지
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
          setTransformOrigin("center center");
          e.preventDefault();
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;

        // zoom > 1 + 보기모드 → 패닝 시작
        if (scaleRef.current > 1 && !isDrawModeRef.current) {
          panRef.current = {
            startX: e.touches[0].clientX,
            startY: e.touches[0].clientY,
            startTranslate: { ...translate },
          };
        }
      }
    },
    [translate, transformOrigin, cancelPageMotion],
  );

  const handleSheetTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dist = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const newScale = Math.min(3, Math.max(1, pinchRef.current.startScale * (dist / pinchRef.current.startDist)));
      const dx = center.x - pinchRef.current.startCenter.x;
      const dy = center.y - pinchRef.current.startCenter.y;

      if (newScale <= 1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setScale(newScale);
        setTranslate({
          x: pinchRef.current.startTranslate.x + dx,
          y: pinchRef.current.startTranslate.y + dy,
        });
      }
      e.preventDefault();
    } else if (e.touches.length === 1 && panRef.current && scaleRef.current > 1) {
      // 1-finger 패닝 (zoom > 1, 보기모드)
      const dx = e.touches[0].clientX - panRef.current.startX;
      const dy = e.touches[0].clientY - panRef.current.startY;
      setTranslate({
        x: panRef.current.startTranslate.x + dx,
        y: panRef.current.startTranslate.y + dy,
      });
      e.preventDefault();
    }
  }, []);

  const handleSheetTouchEnd = useCallback(() => {
    pinchRef.current = null;
    panRef.current = null;
  }, []);

  const handleSendCommand = (command: { id: string; emoji: string; label: string }) => {
    if (!id || !currentProfileId) return;
    socket.emit("command:send", {
      worshipId: id,
      commandId: command.id,
      profileId: currentProfileId,
    });
  };

  const handleSpotlightCall = () => {
    if (!id || !currentProfileId || !currentSheet) return;
    socket.emit("page:spotlight", {
      worshipId: id,
      sheetId: currentSheet.id,
      sheetTitle: currentSheet.title,
      profileId: currentProfileId,
    });
    toast.success("현재 페이지를 호출했습니다");
  };

  return (
    <div className="h-dvh flex flex-col bg-slate-900">
      {/* 상단 헤더 (컴팩트 시 세로 콜랩스 + 페이드 — 찌그러짐 없는 push) */}
      <div
        className="grid"
        style={{
          gridTemplateRows: isCompact ? "0fr" : "1fr",
          transition: "grid-template-rows var(--dur-panel) var(--ease-out)",
        }}
      >
        <div className="overflow-hidden">
          <header
            className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between"
            style={{
              opacity: isCompact ? 0 : 1,
              transform: isCompact ? "translateY(-100%)" : "translateY(0)",
              transition: "opacity var(--dur-panel) var(--ease-out), transform var(--dur-panel) var(--ease-out)",
            }}
            inert={isCompact}
          >
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="hover:bg-slate-700 text-slate-300" asChild>
                <Link to="/worship-list">
                  <ArrowLeft className="w-6 h-6" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-slate-700 text-slate-300"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <Menu className="w-6 h-6" />
              </Button>
              <div className="h-8 w-px bg-slate-600" />
              <h1 className="text-xl font-bold text-white">{worshipData?.title || "예배"}</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* 서버 연결 상태 인디케이터 */}
              {!isConnected && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium text-red-400">연결 끊김</span>
                </div>
              )}
              <Button variant="ghost" size="sm" className="bg-slate-700 text-slate-300 hover:bg-slate-600" asChild>
                <Link to={`/worship-edit/${id}`}>
                  <Edit className="w-5 h-5" />
                  <span>편집</span>
                </Link>
              </Button>
              {/* 컴팩트 시 헤더가 접히면 포털된 PopoverContent도 함께 닫음(inert는 포털 밖을 못 막음) */}
              <Popover open={presencePopoverOpen && !isCompact} onOpenChange={setPresencePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer"
                  >
                    <Users className="w-5 h-5" />
                    <span>{presenceUsers.length}명 접속</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 bg-slate-800 border-slate-700 p-0" align="end">
                  <div className="p-3 border-b border-slate-700">
                    <h3 className="text-sm font-semibold text-white">접속 중인 사용자</h3>
                  </div>
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {presenceUsers.map((user) => (
                      <div key={user.profileId} className="flex items-center gap-3 px-2 py-2 rounded-lg">
                        <span className="text-lg">{user.roleIcon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{user.name}</div>
                          <div className="text-xs text-slate-400">{user.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>
        </div>
      </div>

      {/* 컴팩트 모드: 연결 끊김 시 플로팅 인디케이터 */}
      {isCompact && !isConnected && (
        <div className="absolute top-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-400">연결 끊김</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 악보 리스트 */}
        <motion.aside
          aria-hidden={!showSidebar}
          inert={!showSidebar}
          initial={false}
          animate={showSidebar ? { width: "16rem", opacity: 1, x: 0 } : { width: "0rem", opacity: 0, x: -12 }}
          transition={shouldReduceMotion ? { duration: 0 } : panelTransition}
          className={cn("shrink-0 bg-slate-800 overflow-hidden", showSidebar && "border-r border-slate-700")}
          style={{ pointerEvents: showSidebar ? "auto" : "none" }}
        >
          {/* 좌측은 첫 flex 항목이라 콘텐츠가 화면 끝에 고정됨 → 내부 독립 translate를
              쓰면 프레임과 분리된 parallax로 보인다. opacity만 페이드하고 슬라이드는
              aside의 x(-12→0)에 맡겨 패널 전체가 한 덩어리로 움직이게 한다.
              (우측 패널은 콘텐츠가 움직이는 divider를 따라가 통합 슬라이드로 읽히므로 내부 x 유지) */}
          <motion.div
            animate={showSidebar ? { opacity: 1 } : { opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : panelContentTransition}
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
                      onClick={() => commitPage(index)}
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
                  <Link to={`/worship-edit/${id}`}>
                    <Edit className="w-4 h-4" />
                    편집 페이지에서 추가
                  </Link>
                </Button>
              </div>
            )}
          </motion.div>
        </motion.aside>

        {/* 중앙 악보 뷰어 */}
        <main
          className="flex-1 flex flex-col bg-slate-900"
          style={isDrawMode ? { touchAction: "none", overscrollBehaviorX: "none" } : undefined}
        >
          {/* 도구 바 (컴팩트 시 세로 콜랩스 + 페이드) */}
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
                                  onClick={() => drawingUndo()}
                                >
                                  <Undo className="w-5 h-5" />
                                  <span className="text-sm">되돌리기</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 flex-1"
                                  onClick={() => drawingRedo()}
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
                        onClick={() => drawingUndo()}
                      >
                        <Undo className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-2.5"
                        onClick={() => drawingRedo()}
                      >
                        <Redo className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {currentSheet && (
                    <Button
                      size="sm"
                      className="bg-amber-600 text-white hover:bg-amber-700 px-4 py-2.5 rounded-xl"
                      onClick={handleSpotlightCall}
                      title="현재 페이지를 다른 사용자에게 호출"
                    >
                      <Megaphone className="w-5 h-5" />
                      <span className="text-sm">호출</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCommandPanel(!showCommandPanel)}
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
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <div className="text-center">
                      <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-500 text-lg">악보를 업로드하세요</p>
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
              <div
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/70 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-2xl transition-opacity duration-300",
                  showNavBar ? "opacity-100" : "opacity-0 pointer-events-none",
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-slate-700 hover:bg-slate-600 text-white"
                  onClick={() => goToPageWithMotion(currentPage - 1)}
                  disabled={currentPage <= 0}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <span className="text-white font-semibold text-lg min-w-25 text-center">
                  {currentPage + 1} / {sheets.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-slate-700 hover:bg-slate-600 text-white"
                  onClick={() => goToPageWithMotion(currentPage + 1)}
                  disabled={currentPage >= sheets.length - 1}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* 우측 명령 패널 */}
        <motion.aside
          aria-hidden={!showCommandPanel}
          inert={!showCommandPanel}
          initial={false}
          animate={
            showCommandPanel ? { width: commandPanelWidth, opacity: 1, x: 0 } : { width: "0rem", opacity: 0, x: 12 }
          }
          transition={shouldReduceMotion ? { duration: 0 } : panelTransition}
          className={cn("shrink-0 bg-slate-800 overflow-hidden", showCommandPanel && "border-l border-slate-700")}
          style={{ pointerEvents: showCommandPanel ? "auto" : "none" }}
        >
          <motion.div
            animate={showCommandPanel ? { opacity: 1, x: 0 } : { opacity: 0, x: 8 }}
            transition={shouldReduceMotion ? { duration: 0 } : panelContentTransition}
            className="h-full overflow-y-auto p-4 box-border"
            style={{ width: commandPanelWidth }}
          >
            <h2 className="text-lg font-bold text-white mb-4">명령 전송</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {commands.map((command) => (
                <button
                  key={command.id}
                  onClick={() => handleSendCommand(command)}
                  className="flex flex-col items-center gap-2 p-6 bg-slate-700 hover:bg-slate-600 rounded-2xl transition-all active:scale-95 group"
                >
                  <span className="text-5xl group-hover:scale-110 transition-transform">{command.emoji}</span>
                  <span className="text-sm font-semibold text-slate-300 text-center">{command.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.aside>
      </div>
    </div>
  );
}
