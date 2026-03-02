import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
import { useSwipeable } from "react-swipeable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorship, useCommands } from "@/hooks/queries";
import { useAppStore } from "@/store/appStore";
import { useWorshipSocket } from "@/hooks/useWorshipSocket";
import SheetCanvas, { type EraserType } from "@/components/SheetCanvas";
import { useDrawingSync } from "@/hooks/useDrawingSync";
import { getSocket, setWorshipRoom } from "@/hooks/useSocket";

const penColors = [
  { color: "bg-red-500", value: "#ef4444" },
  { color: "bg-blue-500", value: "#3b82f6" },
  { color: "bg-green-500", value: "#22c55e" },
  { color: "bg-purple-500", value: "#a855f7" },
  { color: "bg-white border border-slate-500", value: "#ffffff" },
  { color: "bg-black", value: "#000000" },
];

interface PresenceUser {
  profileId: string;
  name: string;
  role: string;
  roleIcon: string;
  sheetId: string | null;
}

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
  const [isCompact, setIsCompact] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
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

  const socket = getSocket();

  // Socket.IO + TanStack Query 브릿지 (sheets:updated, worship:updated)
  useWorshipSocket(id, (updatedSheets) => {
    // 현재 보는 악보가 삭제되면 첫 번째로 이동
    if (currentSheetId && !updatedSheets.find((s) => s.id === currentSheetId)) {
      setCurrentSheetId(updatedSheets[0]?.id || null);
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

  // Socket: 예배 입장/퇴장
  useEffect(() => {
    if (!id || !currentProfileId) return;

    socket.emit("join:worship", { worshipId: id, profileId: currentProfileId });
    setWorshipRoom({ worshipId: id, profileId: currentProfileId });

    return () => {
      socket.emit("leave:worship", { worshipId: id });
      setWorshipRoom(null);
    };
  }, [id, currentProfileId, socket]);

  // Socket: 연결 상태 추적
  const [isConnected, setIsConnected] = useState(socket.connected);
  useEffect(() => {
    const onDisconnect = () => setIsConnected(false);
    const onConnect = () => setIsConnected(true);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);
    return () => {
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
    };
  }, [socket]);

  // Socket: 페이지 변경 알림
  useEffect(() => {
    if (!id || !currentSheetId) return;
    socket.emit("page:change", { worshipId: id, sheetId: currentSheetId });
  }, [id, currentSheetId, socket]);

  // Socket: 접속자 현황 + 명령 + 스포트라이트
  useEffect(() => {
    const handlePresence = (data: { worshipId: string; users: PresenceUser[] }) => {
      if (data.worshipId === id) {
        // 중복 프로필 제거
        const seen = new Set<string>();
        const unique = data.users.filter((u) => {
          if (seen.has(u.profileId)) return false;
          seen.add(u.profileId);
          return true;
        });
        setPresenceUsers(unique);
      }
    };

    const handleCommand = (data: {
      commandId: string;
      emoji: string;
      label: string;
      senderName: string;
      senderRole: string;
      senderRoleIcon: string;
    }) => {
      const toastId = `command-${Date.now()}`;
      toast.custom(
        () => (
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 flex items-center gap-4 min-w-87.5 border-4 border-blue-500 cursor-pointer"
            onClick={() => toast.dismiss(toastId)}
          >
            <div className="text-6xl">{data.emoji}</div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-slate-800">{data.label}</div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                <span className="text-lg">{data.senderRoleIcon}</span>
                <span className="font-semibold">{data.senderName}</span>
                <span>님이 전송</span>
              </div>
            </div>
          </div>
        ),
        { duration: 3000, position: "top-center", id: toastId },
      );
    };

    const handleSpotlight = (data: { sheetId: string; sheetTitle: string; senderName: string; senderRole: string }) => {
      const toastId = `spotlight-${Date.now()}`;
      toast.custom(
        () => (
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 flex items-center gap-4 min-w-87.5 border-4 border-amber-500 cursor-pointer active:bg-amber-50 transition-colors"
            onClick={() => {
              setCurrentSheetId(data.sheetId);
              toast.dismiss(toastId);
            }}
          >
            <div className="text-4xl">📢</div>
            <div className="flex-1">
              <div className="text-lg font-bold text-slate-800">{data.senderName}님이 호출합니다</div>
              <div className="text-sm text-slate-500 mt-1">&quot;{data.sheetTitle}&quot;로 이동하려면 클릭하세요</div>
            </div>
          </div>
        ),
        { duration: 10000, position: "top-center", id: toastId },
      );
    };

    socket.on("presence:update", handlePresence);
    socket.on("command:received", handleCommand);
    socket.on("page:spotlight", handleSpotlight);

    return () => {
      socket.off("presence:update", handlePresence);
      socket.off("command:received", handleCommand);
      socket.off("page:spotlight", handleSpotlight);
    };
  }, [id, socket]);

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

  const goToPage = useCallback(
    (index: number) => {
      if (index >= 0 && index < sheets.length) {
        setCurrentSheetId(sheets[index].id);
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        setTransformOrigin("center center");
        flashNavBar();
      }
    },
    [sheets, flashNavBar],
  );

  // 핀치줌 유틸
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
        // 핀치 시작
        const dist = getTouchDistance(e.touches);
        const center = getTouchCenter(e.touches);
        pinchRef.current = {
          startDist: dist,
          startScale: scaleRef.current,
          startCenter: center,
          startTranslate: { ...translate },
        };
        panRef.current = null;

        // 핀치 중심점을 transformOrigin으로 설정
        const container = sheetContainerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const relX = ((center.x - rect.left) / rect.width) * 100;
          const relY = ((center.y - rect.top) / rect.height) * 100;
          setTransformOrigin(`${relX}% ${relY}%`);
        }

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
    [translate],
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

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isDrawModeRef.current && scaleRef.current <= 1) goToPage(currentPage + 1);
    },
    onSwipedRight: () => {
      if (!isDrawModeRef.current && scaleRef.current <= 1) goToPage(currentPage - 1);
    },
    trackMouse: true,
    delta: 50,
    preventScrollOnSwipe: true,
  });

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
      {/* 상단 헤더 */}
      {!isCompact && (
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
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
            <Popover>
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
      )}

      {/* 컴팩트 모드: 연결 끊김 시 플로팅 인디케이터 */}
      {isCompact && !isConnected && (
        <div className="absolute top-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-400">연결 끊김</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 악보 리스트 */}
        {showSidebar && (
          <aside className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-4">악보 목록</h2>

              {sheets.length > 0 ? (
                <div className="space-y-2">
                  {sheets.map((sheet, index) => {
                    const usersOnSheet = presenceUsers.filter((u) => u.sheetId === sheet.id);
                    return (
                      <button
                        key={sheet.id}
                        onClick={() => setCurrentSheetId(sheet.id)}
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
            </div>
          </aside>
        )}

        {/* 중앙 악보 뷰어 */}
        <main
          className="flex-1 flex flex-col bg-slate-900"
          style={isDrawMode ? { touchAction: "none", overscrollBehaviorX: "none" } : undefined}
          {...swipeHandlers}
        >
          {/* 도구 바 */}
          {!isCompact && (
            <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
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
          )}

          {/* 악보 영역 */}
          <div
            className="flex-1 relative overflow-hidden"
            style={{ touchAction: "none" }}
            onClick={() => {
              if (!isDrawMode) {
                setIsCompact((prev) => !prev);
                flashNavBar();
              }
            }}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
          >
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div
                className="relative bg-white rounded-2xl shadow-2xl aspect-3/4 h-full overflow-hidden"
                ref={sheetContainerRef}
                style={
                  scale !== 1
                    ? {
                        transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
                        transformOrigin,
                      }
                    : undefined
                }
              >
                {currentSheet ? (
                  <SheetCanvas
                    key={currentSheet.id}
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
            </div>

            {/* 페이지 네비게이션 */}
            {sheets.length > 0 && (
              <div
                className={cn(
                  "absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/70 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-2xl transition-opacity duration-300",
                  showNavBar ? "opacity-100" : "opacity-0 pointer-events-none",
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-slate-700 hover:bg-slate-600 text-white"
                  onClick={() => goToPage(currentPage - 1)}
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
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= sheets.length - 1}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* 우측 명령 패널 */}
        {showCommandPanel && (
          <aside className="w-44 lg:w-80 bg-slate-800 border-l border-slate-700 overflow-y-auto">
            <div className="p-4">
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
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
