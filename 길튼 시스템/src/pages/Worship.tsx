import { useState, useRef } from "react";
import { Link, useParams } from "react-router";
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
  Upload
} from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { toast, Toaster } from "sonner@2.0.3";
import { useWorshipStore } from "../store/worshipStore";
import { useCommandStore } from "../store/commandStore";
import { useProfileStore } from "../store/profileStore";
import SheetCanvas, { SheetCanvasRef, EraserType } from "../components/SheetCanvas";

const penColors = [
  { color: "bg-red-500", value: "#ef4444" },
  { color: "bg-blue-500", value: "#3b82f6" },
  { color: "bg-green-500", value: "#22c55e" },
  { color: "bg-yellow-400", value: "#facc15" },
  { color: "bg-purple-500", value: "#a855f7" },
  { color: "bg-black", value: "#000000" },
];

export default function Worship() {
  const { id } = useParams();
  const canvasRef = useRef<SheetCanvasRef>(null);
  
  const { getWorshipById, updateWorship } = useWorshipStore();
  const { commands } = useCommandStore();
  const { getCurrentProfile } = useProfileStore();
  const worship = id ? getWorshipById(id) : null;
  const currentProfile = getCurrentProfile();

  const [currentPage, setCurrentPage] = useState(0);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(3);
  const [eraserType, setEraserType] = useState<EraserType>('none');
  const [eraserWidth, setEraserWidth] = useState(15);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCommandPanel, setShowCommandPanel] = useState(false);

  const sheets = worship?.sheets || [];
  const currentSheet = sheets[currentPage];

  // 파일을 Base64 Data URL로 변환
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!worship || !id) return;

    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => 
      file.type === "image/jpeg" || file.type === "image/png"
    );

    if (imageFiles.length !== files.length) {
      alert("JPG, PNG 이미지 파일만 업로드 가능합니다.");
    }

    try {
      const newSheets = await Promise.all(
        imageFiles.map(async (file, index) => {
          const imageUrl = await fileToDataUrl(file);
          return {
            id: Date.now() + Math.random() * 1000000 + index,
            fileName: file.name,
            title: file.name.replace(/\.[^/.]+$/, ""),
            thumbnail: "📄",
            order: sheets.length + index,
            imageUrl,
            drawingPaths: [],
          };
        })
      );

      updateWorship(id, {
        sheets: [...sheets, ...newSheets],
      });

      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("파일 업로드 중 오류:", error);
      alert("파일 업로드 중 오류가 발생했습니다.");
    }
  };

  const handleDrawingChange = (paths: any[]) => {
    if (!worship || !id || !currentSheet) return;

    const updatedSheets = sheets.map((sheet, index) => 
      index === currentPage 
        ? { ...sheet, drawingPaths: paths }
        : sheet
    );

    updateWorship(id, { sheets: updatedSheets });
  };

  const handleUndo = () => {
    if (canvasRef.current?.undo) {
      canvasRef.current.undo();
    }
  };

  const handleRedo = () => {
    if (canvasRef.current?.redo) {
      canvasRef.current.redo();
    }
  };

  const increasePenWidth = () => {
    setPenWidth(prev => Math.min(prev + 1, 20));
  };

  const decreasePenWidth = () => {
    setPenWidth(prev => Math.max(prev - 1, 1));
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setCurrentPage(Math.min(sheets.length - 1, currentPage + 1)),
    onSwipedRight: () => setCurrentPage(Math.max(0, currentPage - 1)),
    trackMouse: true,
    delta: 50,
    preventScrollOnSwipe: true,
  });

  const handleSendCommand = (command: { emoji: string; label: string }) => {
    const senderName = currentProfile?.name || '익명';
    const senderIcon = currentProfile?.icon || '👤';
    
    toast.custom(
      (t) => (
        <div className="bg-white rounded-2xl shadow-2xl p-6 flex items-center gap-4 min-w-[350px] border-4 border-blue-500">
          <div className="text-6xl">{command.emoji}</div>
          <div className="flex-1">
            <div className="text-2xl font-bold text-slate-800">{command.label}</div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <span className="text-lg">{senderIcon}</span>
              <span className="font-semibold">{senderName}</span>
              <span>님이 전송</span>
            </div>
          </div>
        </div>
      ),
      {
        duration: 3000,
        position: 'top-center',
      }
    );
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <Toaster richColors position="top-center" />
      
      {/* 상단 헤더 */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to="/worship-list" 
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-slate-300" />
          </Link>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors active:scale-95"
          >
            <Menu className="w-6 h-6 text-slate-300" />
          </button>
          <div className="h-8 w-px bg-slate-600" />
          <h1 className="text-xl font-bold text-white">{worship?.title || "예배"}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/worship-edit/${id}`}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors active:scale-95"
          >
            <Edit className="w-5 h-5" />
            <span className="font-semibold">편집</span>
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
            <Users className="w-5 h-5" />
            <span className="font-semibold">12명 접속</span>
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg">
            <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse" />
            <span className="text-white font-semibold">인도자</span>
          </div>
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
                  {sheets.map((sheet, index) => (
                    <button
                      key={`${sheet.id}-${index}`}
                      onClick={() => setCurrentPage(index)}
                      className={`w-full text-left p-4 rounded-xl cursor-pointer transition-colors ${
                        currentPage === index
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileMusic className="w-5 h-5" />
                        <div className="flex-1">
                          <div className="font-semibold mb-1">{sheet.title}</div>
                          <div className="text-sm opacity-75">페이지 {index + 1}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-700 rounded-xl">
                  <FileMusic className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm mb-4">악보가 없습니다</p>
                  <Link
                    to={`/worship-edit/${id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
                  >
                    <Edit className="w-4 h-4" />
                    편집 페이지에서 추가
                  </Link>
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
              <button
                onClick={() => setIsDrawMode(!isDrawMode)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                  isDrawMode
                    ? "bg-green-600 text-white shadow-lg"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
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
              </button>

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
                          selectedColor === pen.value && eraserType === 'none' ? "ring-4 ring-white scale-110" : ""
                        }`}
                      />
                    ))}
                  </div>
                  <div className="h-8 w-px bg-slate-600" />
                  
                  {/* 펜 굵기 조절 */}
                  <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
                    <button
                      onClick={decreasePenWidth}
                      className="p-1 hover:bg-slate-600 rounded transition-colors"
                    >
                      <Minus className="w-4 h-4 text-slate-300" />
                    </button>
                    <div className="text-slate-300 font-semibold min-w-[30px] text-center">
                      {penWidth}
                    </div>
                    <button
                      onClick={increasePenWidth}
                      className="p-1 hover:bg-slate-600 rounded transition-colors"
                    >
                      <PlusIcon className="w-4 h-4 text-slate-300" />
                    </button>
                  </div>

                  <div className="h-8 w-px bg-slate-600" />
                  
                  {/* 지우개 버튼 그룹 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEraserType(prev => prev === 'area' ? 'none' : 'area')}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold transition-all ${
                        eraserType === 'area'
                          ? "bg-orange-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                      title="영역 지우개"
                    >
                      <Eraser className="w-5 h-5" />
                      <span className="text-sm">영역</span>
                    </button>
                    <button
                      onClick={() => setEraserType(prev => prev === 'stroke' ? 'none' : 'stroke')}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold transition-all ${
                        eraserType === 'stroke'
                          ? "bg-red-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                      title="획 지우개"
                    >
                      <Trash className="w-5 h-5" />
                      <span className="text-sm">획</span>
                    </button>
                  </div>

                  {/* 지우개 굵기 조절 (영역 지우개일 때만) */}
                  {eraserType === 'area' && (
                    <>
                      <div className="h-8 w-px bg-slate-600" />
                      <div className="flex items-center gap-2 bg-orange-700 rounded-lg px-3 py-2">
                        <button
                          onClick={() => setEraserWidth(prev => Math.max(prev - 2, 5))}
                          className="p-1 hover:bg-orange-600 rounded transition-colors"
                        >
                          <Minus className="w-4 h-4 text-white" />
                        </button>
                        <div className="text-white font-semibold min-w-[30px] text-center">
                          {eraserWidth}
                        </div>
                        <button
                          onClick={() => setEraserWidth(prev => Math.min(prev + 2, 50))}
                          className="p-1 hover:bg-orange-600 rounded transition-colors"
                        >
                          <PlusIcon className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </>
                  )}

                  <div className="h-8 w-px bg-slate-600" />
                  
                  <button
                    onClick={handleUndo}
                    className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <Undo className="w-5 h-5 text-slate-300" />
                  </button>
                  <button
                    onClick={handleRedo}
                    className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <Redo className="w-5 h-5 text-slate-300" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCommandPanel(!showCommandPanel)}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                  showCommandPanel
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                명령 패널
              </button>
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
                    imageUrl={currentSheet.imageUrl || null}
                    isDrawMode={isDrawMode}
                    penColor={selectedColor}
                    penWidth={penWidth}
                    eraserType={eraserType}
                    eraserWidth={eraserWidth}
                    onDrawingChange={handleDrawingChange}
                    initialPaths={currentSheet.drawingPaths || []}
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
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="p-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <span className="text-white font-semibold text-lg min-w-[100px] text-center">
                  {currentPage + 1} / {sheets.length}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(sheets.length - 1, currentPage + 1))}
                  disabled={currentPage === sheets.length - 1}
                  className="p-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
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