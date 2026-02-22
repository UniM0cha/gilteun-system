import { useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  Trash2, 
  GripVertical,
  Calendar,
  FileText,
  Image as ImageIcon,
  X,
  Tag,
  Plus,
  Pencil,
  Check,
  Eye
} from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useWorshipStore, Sheet } from "../store/worshipStore";

// 드래그 가능한 악보 아이템 컴포넌트
function DraggableSheetItem({ 
  sheet, 
  index, 
  moveSheet, 
  onDelete,
  onEdit,
  editingId,
  editingTitle,
  onTitleChange,
  onSaveTitle,
  onCancelEdit
}: { 
  sheet: Sheet; 
  index: number; 
  moveSheet: (dragIndex: number, hoverIndex: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, title: string) => void;
  editingId: number | null;
  editingTitle: string;
  onTitleChange: (title: string) => void;
  onSaveTitle: () => void;
  onCancelEdit: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [{ handlerId }, drop] = useDrop({
    accept: 'sheet',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      moveSheet(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'sheet',
    item: () => {
      return { id: sheet.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  preview(drop(ref));

  const isEditing = editingId === sheet.id;

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      className={`bg-white rounded-xl p-4 border-2 transition-all ${
        isDragging 
          ? "opacity-50 border-blue-400 shadow-lg" 
          : "border-slate-200 hover:border-blue-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          ref={drag}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <GripVertical className="w-5 h-5 text-slate-400" />
        </div>

        {/* 이미지 미리보기 */}
        <div className="relative group">
          {sheet.imageUrl ? (
            <div 
              className="relative w-20 h-24 rounded-lg overflow-hidden border-2 border-blue-300 cursor-pointer shadow-md"
              onClick={() => setShowPreview(true)}
            >
              <img 
                src={sheet.imageUrl} 
                alt={sheet.title}
                className="w-full h-full object-cover"
              />
              {/* iPad 터치 친화적 미리보기 힌트 - 항상 표시 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 flex items-center justify-center">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </div>
          ) : (
            <div className="w-20 h-24 bg-gradient-to-br from-amber-50 to-orange-100 rounded-lg flex items-center justify-center text-3xl border-2 border-slate-200">
              {sheet.thumbnail}
            </div>
          )}
        </div>

        {/* 제목 편집 영역 */}
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSaveTitle();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancelEdit();
                  }
                }}
                autoFocus
                className="w-full px-3 py-2 bg-slate-50 border-2 border-blue-500 rounded-lg focus:outline-none"
                placeholder="악보 제목"
              />
              <div className="flex gap-2">
                <button
                  onClick={onSaveTitle}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold"
                >
                  <Check className="w-3.5 h-3.5" />
                  저장
                </button>
                <button
                  onClick={onCancelEdit}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg transition-colors text-sm font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="font-semibold text-slate-800">{sheet.title}</div>
                <button
                  onClick={() => onEdit(sheet.id, sheet.title)}
                  className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                  title="제목 수정"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-sm text-slate-500 mt-1">{sheet.fileName}</div>
            </>
          )}
        </div>

        <div className="text-2xl font-bold text-slate-300 min-w-[40px] text-center">
          {index + 1}
        </div>

        {!isEditing && (
          <button
            onClick={() => onDelete(sheet.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 이미지 미리보기 모달 */}
      {showPreview && sheet.imageUrl && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-5xl max-h-full">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={sheet.imageUrl} 
              alt={sheet.title}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-6 py-3 rounded-full font-semibold">
              {sheet.title}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WorshipEditContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { worshipTypes, getWorshipById, addWorship, updateWorship } = useWorshipStore();
  
  const existingWorship = !isNew && id ? getWorshipById(id) : null;

  const [title, setTitle] = useState(existingWorship?.title || "");
  const [date, setDate] = useState(existingWorship?.date || "");
  const [typeId, setTypeId] = useState(existingWorship?.typeId || (worshipTypes[0]?.id || ""));
  const [sheets, setSheets] = useState<Sheet[]>(existingWorship?.sheets || []);
  const [editingSheetId, setEditingSheetId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const selectedType = worshipTypes.find(t => t.id === typeId);

  // 파일을 Base64 Data URL로 변환
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const moveSheet = (dragIndex: number, hoverIndex: number) => {
    const newSheets = [...sheets];
    const [removed] = newSheets.splice(dragIndex, 1);
    newSheets.splice(hoverIndex, 0, removed);
    setSheets(newSheets.map((sheet, index) => ({ ...sheet, order: index })));
  };

  const deleteSheet = (id: number) => {
    if (confirm("이 악보를 삭제하시겠습니까?")) {
      setSheets(sheets.filter(sheet => sheet.id !== id));
    }
  };

  const handleEditSheetTitle = (sheetId: number, currentTitle: string) => {
    setEditingSheetId(sheetId);
    setEditingTitle(currentTitle);
  };

  const handleSaveSheetTitle = () => {
    if (!editingSheetId) return;
    
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      alert("제목을 입력해주세요.");
      return;
    }

    setSheets(sheets.map(sheet =>
      sheet.id === editingSheetId
        ? { ...sheet, title: trimmedTitle }
        : sheet
    ));

    setEditingSheetId(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingSheetId(null);
    setEditingTitle("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            id: Date.now() + index,
            fileName: file.name,
            title: file.name.replace(/\.[^/.]+$/, ""),
            thumbnail: "📄",
            order: sheets.length + index,
            imageUrl,
            drawingPaths: [],
          };
        })
      );

      setSheets([...sheets, ...newSheets]);
      
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("파일 업로드 중 오류:", error);
      alert("파일 업로드 중 오류가 발생했습니다.");
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('예배 제목을 입력해주세요.');
      return;
    }
    if (!date) {
      alert('예배 날짜를 선택해주세요.');
      return;
    }
    if (!typeId) {
      alert('예배 유형을 선택해주세요.');
      return;
    }

    const worshipData = {
      title,
      date,
      typeId,
      sheets,
    };

    if (isNew) {
      addWorship(worshipData);
    } else if (id) {
      updateWorship(id, worshipData);
    }

    navigate('/worship-list');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">
              {isNew ? "새 예배 만들기" : "예배 편집"}
            </h1>
            <p className="text-slate-600">예배 정보와 악보를 관리하세요</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
          >
            <Save className="w-5 h-5" />
            저장하기
          </button>
        </div>

        {/* 예배 정보 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">예배 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  예배 제목 *
                </div>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 2024년 1월 첫째주 주일예배"
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  예배 날짜 *
                </div>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  예배 유형 *
                </div>
              </label>
              {worshipTypes.length > 0 ? (
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg transition-colors"
                >
                  {worshipTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-5 py-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-yellow-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-5 h-5" />
                    <span className="font-semibold">예배 유형이 없습니다</span>
                  </div>
                  <p className="text-sm mb-3">먼저 예배 유형을 생성해주세요.</p>
                  <Link
                    to="/worship-type-settings"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    예배 유형 관리
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 악보 업로드 섹션 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">악보 관리</h2>
              <p className="text-sm text-slate-500 mt-1">
                드래그하여 순서를 변경하거나 제목을 수정할 수 있습니다
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-md active:scale-95"
            >
              <Upload className="w-5 h-5" />
              악보 추가
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* 업로드 안내 */}
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <ImageIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1 text-sm text-blue-800">
                <div className="font-semibold mb-1">악보 업로드 안내</div>
                <ul className="space-y-1 text-blue-700">
                  <li>• JPG, PNG 이미지 파일만 지원합니다</li>
                  <li>• 여러 파일을 한 번에 선택하여 업로드할 수 있습니다</li>
                  <li>• 드래그하여 악보 순서를 자유롭게 변경하세요</li>
                  <li>• 이미지 클릭 시 미리보기가 가능합니다</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 악보 목록 */}
          {sheets.length > 0 ? (
            <div className="space-y-3">
              {sheets.map((sheet, index) => (
                <DraggableSheetItem
                  key={`${sheet.id}-${index}`}
                  sheet={sheet}
                  index={index}
                  moveSheet={moveSheet}
                  onDelete={deleteSheet}
                  onEdit={handleEditSheetTitle}
                  editingId={editingSheetId}
                  editingTitle={editingTitle}
                  onTitleChange={setEditingTitle}
                  onSaveTitle={handleSaveSheetTitle}
                  onCancelEdit={handleCancelEdit}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                아직 악보가 없습니다
              </h3>
              <p className="text-slate-500 mb-6">
                악보 추가 버튼을 눌러 이미지를 업로드하세요
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md active:scale-95"
              >
                <Upload className="w-5 h-5" />
                악보 추가
              </button>
            </div>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
            <div className="text-sm font-semibold text-blue-700 mb-1">총 악보</div>
            <div className="text-3xl font-bold text-blue-900">{sheets.length}개</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200">
            <div className="text-sm font-semibold text-green-700 mb-1">예배 날짜</div>
            <div className="text-xl font-bold text-green-900">
              {date || "미정"}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200">
            <div className="text-sm font-semibold text-purple-700 mb-1">상태</div>
            <div className="text-xl font-bold text-purple-900">
              {title && date && sheets.length > 0 ? "준비완료" : "작성중"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorshipEdit() {
  return (
    <DndProvider backend={HTML5Backend}>
      <WorshipEditContent />
    </DndProvider>
  );
}