import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
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
} from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useWorshipStore, type Sheet } from '@/store/worshipStore';
import { useCommandStore } from '@/store/commandStore';
import { useProfileStore } from '@/store/profileStore';
import { useRoleStore } from '@/store/roleStore';
import SheetCanvas, { type SheetCanvasRef, type EraserType } from '@/components/SheetCanvas';
import { useDrawingSync } from '@/hooks/useDrawingSync';
import { getSocket } from '@/hooks/useSocket';

const penColors = [
  { color: 'bg-red-500', value: '#ef4444' },
  { color: 'bg-blue-500', value: '#3b82f6' },
  { color: 'bg-green-500', value: '#22c55e' },
  { color: 'bg-yellow-400', value: '#facc15' },
  { color: 'bg-purple-500', value: '#a855f7' },
  { color: 'bg-black', value: '#000000' },
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
  const canvasRef = useRef<SheetCanvasRef>(null);

  const { fetchWorship } = useWorshipStore();
  const { commands, fetchCommands } = useCommandStore();
  const { currentProfileId, profiles, fetchProfiles } = useProfileStore();
  const { roles, fetchRoles } = useRoleStore();

  const [worship, setWorship] = useState<{
    id: string;
    title: string;
    date: string;
    typeId: string;
    sheets: Sheet[];
  } | null>(null);
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [penWidth, setPenWidth] = useState(3);
  const [eraserType, setEraserType] = useState<EraserType>('none');
  const [eraserWidth, setEraserWidth] = useState(15);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCommandPanel, setShowCommandPanel] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  const currentProfile = profiles.find((p) => p.id === currentProfileId);
  const currentRole = currentProfile ? roles.find((r) => r.id === currentProfile.roleId) : null;

  const sheets = worship?.sheets || [];
  const currentSheet = sheets.find((s) => s.id === currentSheetId) || null;
  const currentPage = sheets.findIndex((s) => s.id === currentSheetId);

  const socket = getSocket();

  // 드로잉 동기화 훅
  const {
    remotePaths,
    remoteInProgress,
    emitDrawStart,
    emitDrawMove,
    emitDrawEnd,
    emitDrawDelete,
    emitDrawClear,
  } = useDrawingSync({
    sheetId: currentSheetId,
    profileId: currentProfileId,
    enabled: !!id,
  });

  // 프로필 미선택 시 홈으로 리다이렉트
  useEffect(() => {
    if (!currentProfileId) {
      navigate('/');
    }
  }, [currentProfileId, navigate]);

  // 데이터 로드
  useEffect(() => {
    fetchCommands();
    fetchProfiles();
    fetchRoles();
  }, [fetchCommands, fetchProfiles, fetchRoles]);

  useEffect(() => {
    if (!id) return;
    fetchWorship(id).then((w) => {
      if (w) {
        setWorship(w);
        if (w.sheets.length > 0 && !currentSheetId) {
          setCurrentSheetId(w.sheets[0].id);
        }
      }
    });
  }, [id, fetchWorship]);

  // Socket: 예배 입장/퇴장
  useEffect(() => {
    if (!id || !currentProfileId) return;

    socket.emit('join:worship', { worshipId: id, profileId: currentProfileId });

    return () => {
      socket.emit('leave:worship', { worshipId: id });
    };
  }, [id, currentProfileId, socket]);

  // Socket: 페이지 변경 알림
  useEffect(() => {
    if (!id || !currentSheetId) return;
    socket.emit('page:change', { worshipId: id, sheetId: currentSheetId });
  }, [id, currentSheetId, socket]);

  // Socket: 접속자 현황 + 명령 + 스포트라이트 + 예배 업데이트
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
      toast.custom(
        () => (
          <div className="bg-white rounded-2xl shadow-2xl p-6 flex items-center gap-4 min-w-[350px] border-4 border-blue-500">
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
        { duration: 3000, position: 'top-center' },
      );
    };

    const handleSpotlight = (data: {
      sheetId: string;
      sheetTitle: string;
      senderName: string;
      senderRole: string;
    }) => {
      toast.custom(
        () => (
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 flex items-center gap-4 min-w-[350px] border-4 border-amber-500 cursor-pointer hover:bg-amber-50 transition-colors"
            onClick={() => setCurrentSheetId(data.sheetId)}
          >
            <div className="text-4xl">📢</div>
            <div className="flex-1">
              <div className="text-lg font-bold text-slate-800">
                {data.senderName}님이 호출합니다
              </div>
              <div className="text-sm text-slate-500 mt-1">
                &quot;{data.sheetTitle}&quot;로 이동하려면 클릭하세요
              </div>
            </div>
          </div>
        ),
        { duration: 5000, position: 'top-center' },
      );
    };

    const handleSheetsUpdated = (data: { worshipId: string; sheets: Sheet[] }) => {
      if (data.worshipId !== id) return;
      setWorship((prev) => {
        if (!prev) return prev;
        return { ...prev, sheets: data.sheets };
      });
      // 현재 보는 악보가 삭제되면 첫 번째로 이동
      if (currentSheetId && !data.sheets.find((s) => s.id === currentSheetId)) {
        setCurrentSheetId(data.sheets[0]?.id || null);
      }
    };

    const handleWorshipUpdated = (data: { worshipId: string; worship: any }) => {
      if (data.worshipId !== id) return;
      setWorship((prev) => {
        if (!prev) return prev;
        return { ...prev, ...data.worship };
      });
    };

    socket.on('presence:update', handlePresence);
    socket.on('command:received', handleCommand);
    socket.on('page:spotlight', handleSpotlight);
    socket.on('sheets:updated', handleSheetsUpdated);
    socket.on('worship:updated', handleWorshipUpdated);

    return () => {
      socket.off('presence:update', handlePresence);
      socket.off('command:received', handleCommand);
      socket.off('page:spotlight', handleSpotlight);
      socket.off('sheets:updated', handleSheetsUpdated);
      socket.off('worship:updated', handleWorshipUpdated);
    };
  }, [id, currentSheetId, socket]);

  const goToPage = useCallback(
    (index: number) => {
      if (index >= 0 && index < sheets.length) {
        setCurrentSheetId(sheets[index].id);
      }
    },
    [sheets],
  );

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => goToPage(currentPage + 1),
    onSwipedRight: () => goToPage(currentPage - 1),
    trackMouse: true,
    delta: 50,
    preventScrollOnSwipe: true,
  });

  const handleSendCommand = (command: { id: string; emoji: string; label: string }) => {
    if (!id || !currentProfileId) return;
    socket.emit('command:send', {
      worshipId: id,
      commandId: command.id,
      profileId: currentProfileId,
    });

    toast.custom(
      () => (
        <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 min-w-[250px] border-2 border-green-400">
          <div className="text-4xl">{command.emoji}</div>
          <div className="flex-1">
            <div className="text-lg font-bold text-slate-800">{command.label}</div>
            <div className="text-sm text-green-600">전송됨</div>
          </div>
        </div>
      ),
      { duration: 1500, position: 'top-center' },
    );
  };

  const handleSpotlightCall = () => {
    if (!id || !currentProfileId || !currentSheet) return;
    socket.emit('page:spotlight', {
      worshipId: id,
      sheetId: currentSheet.id,
      sheetTitle: currentSheet.title,
      profileId: currentProfileId,
    });
    toast.success('현재 페이지를 호출했습니다');
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* 상단 헤더 */}
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
          <h1 className="text-xl font-bold text-white">{worship?.title || '예배'}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="bg-slate-700 text-slate-300 hover:bg-slate-600" asChild>
            <Link to={`/worship-edit/${id}`}>
              <Edit className="w-5 h-5" />
              <span>편집</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-default">
            <Users className="w-5 h-5" />
            <span>{presenceUsers.length}명 접속</span>
          </Button>
          {currentRole && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg">
              <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse" />
              <span className="text-white font-semibold">{currentRole.name}</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 악보 리스트 */}
        {showSidebar && (
          <aside className="w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto">
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
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FileMusic className="w-5 h-5" />
                          <div className="flex-1">
                            <div className="font-semibold mb-1">{sheet.title}</div>
                            <div className="text-sm opacity-75">페이지 {index + 1}</div>
                          </div>
                          {usersOnSheet.length > 0 && (
                            <div className="flex -space-x-1">
                              {usersOnSheet.slice(0, 3).map((u) => (
                                <span
                                  key={u.profileId}
                                  className="text-sm"
                                  title={`${u.name} (${u.role})`}
                                >
                                  {u.roleIcon}
                                </span>
                              ))}
                              {usersOnSheet.length > 3 && (
                                <span className="text-xs text-slate-400 ml-1">
                                  +{usersOnSheet.length - 3}
                                </span>
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
        <main className="flex-1 flex flex-col bg-slate-900" {...(!isDrawMode ? swipeHandlers : {})}>
          {/* 도구 바 */}
          <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDrawMode(!isDrawMode)}
                className={cn(
                  'px-5 py-2.5 rounded-xl',
                  isDrawMode
                    ? 'bg-green-600 text-white shadow-lg hover:bg-green-700'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
                  <div className="h-8 w-px bg-slate-600" />
                  <div className="flex items-center gap-2">
                    {penColors.map((pen) => (
                      <button
                        key={pen.value}
                        onClick={() => {
                          setSelectedColor(pen.value);
                          setEraserType('none');
                        }}
                        className={`w-10 h-10 rounded-lg ${pen.color} transition-transform hover:scale-110 ${
                          selectedColor === pen.value && eraserType === 'none'
                            ? 'ring-4 ring-white scale-110'
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                  <div className="h-8 w-px bg-slate-600" />

                  {/* 펜 굵기 */}
                  <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1 h-auto w-auto hover:bg-slate-600 text-slate-300 rounded"
                      onClick={() => setPenWidth((p) => Math.max(p - 1, 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <div className="text-slate-300 font-semibold min-w-[30px] text-center">
                      {penWidth}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1 h-auto w-auto hover:bg-slate-600 text-slate-300 rounded"
                      onClick={() => setPenWidth((p) => Math.min(p + 1, 20))}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="h-8 w-px bg-slate-600" />

                  {/* 지우개 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEraserType((p) => (p === 'area' ? 'none' : 'area'))}
                      className={cn(
                        'px-3 py-2.5',
                        eraserType === 'area'
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      )}
                      title="영역 지우개"
                    >
                      <Eraser className="w-5 h-5" />
                      <span className="text-sm">영역</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEraserType((p) => (p === 'stroke' ? 'none' : 'stroke'))}
                      className={cn(
                        'px-3 py-2.5',
                        eraserType === 'stroke'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      )}
                      title="획 지우개"
                    >
                      <Trash className="w-5 h-5" />
                      <span className="text-sm">획</span>
                    </Button>
                  </div>

                  {eraserType === 'area' && (
                    <>
                      <div className="h-8 w-px bg-slate-600" />
                      <div className="flex items-center gap-2 bg-orange-700 rounded-lg px-3 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-1 h-auto w-auto hover:bg-orange-600 text-white rounded"
                          onClick={() => setEraserWidth((p) => Math.max(p - 2, 5))}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="text-white font-semibold min-w-[30px] text-center">
                          {eraserWidth}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-1 h-auto w-auto hover:bg-orange-600 text-white rounded"
                          onClick={() => setEraserWidth((p) => Math.min(p + 2, 50))}
                        >
                          <PlusIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="h-8 w-px bg-slate-600" />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300"
                    onClick={() => canvasRef.current?.undo()}
                  >
                    <Undo className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300"
                    onClick={() => canvasRef.current?.redo()}
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
                  'px-5 py-2.5 rounded-xl',
                  showCommandPanel
                    ? 'bg-purple-600 text-white shadow-lg hover:bg-purple-700'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                )}
              >
                명령 패널
              </Button>
            </div>
          </div>

          {/* 악보 영역 */}
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="relative bg-white rounded-2xl shadow-2xl aspect-[3/4] h-full overflow-hidden">
                {currentSheet ? (
                  <SheetCanvas
                    key={currentSheet.id}
                    ref={canvasRef}
                    imageUrl={currentSheet.imagePath || null}
                    isDrawMode={isDrawMode}
                    penColor={selectedColor}
                    penWidth={penWidth}
                    eraserType={eraserType}
                    eraserWidth={eraserWidth}
                    remotePaths={remotePaths}
                    remoteInProgress={remoteInProgress}
                    onDrawStart={emitDrawStart}
                    onDrawMove={emitDrawMove}
                    onDrawEnd={emitDrawEnd}
                    onDrawDelete={emitDrawDelete}
                    onDrawClear={emitDrawClear}
                    profileId={currentProfileId || ''}
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
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/90 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-2xl">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-slate-700 hover:bg-slate-600 text-white"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 0}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <span className="text-white font-semibold text-lg min-w-[100px] text-center">
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
          <aside className="w-80 bg-slate-800 border-l border-slate-700 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-4">명령 전송</h2>
              <div className="grid grid-cols-2 gap-3">
                {commands.map((command) => (
                  <button
                    key={command.id}
                    onClick={() => handleSendCommand(command)}
                    className="flex flex-col items-center gap-2 p-6 bg-slate-700 hover:bg-slate-600 rounded-2xl transition-all active:scale-95 group"
                  >
                    <span className="text-5xl group-hover:scale-110 transition-transform">
                      {command.emoji}
                    </span>
                    <span className="text-sm font-semibold text-slate-300 text-center">
                      {command.label}
                    </span>
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
