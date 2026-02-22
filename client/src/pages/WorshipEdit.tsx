import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { toast } from 'sonner';
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
  Eye,
} from 'lucide-react';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import {
  useWorship,
  useWorshipTypes,
  useAddWorship,
  useUpdateWorship,
  useAddSheet,
  useUpdateSheet,
  useDeleteSheet,
  useReorderSheets,
} from '@/hooks/queries';
import type { Sheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';

function SortableSheetItem({
  sheet,
  index,
  onDelete,
  onEdit,
  editingId,
  editingTitle,
  onTitleChange,
  onSaveTitle,
  onCancelEdit,
}: {
  sheet: Sheet;
  index: number;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  editingId: string | null;
  editingTitle: string;
  onTitleChange: (title: string) => void;
  onSaveTitle: () => void;
  onCancelEdit: () => void;
}) {
  const { ref, handleRef, isDragSource } = useSortable({ id: sheet.id, index });

  const isEditing = editingId === sheet.id;

  return (
    <div
      ref={ref}
      className={`bg-white rounded-xl p-4 border-2 transition-all ${
        isDragSource
          ? 'opacity-50 border-blue-400 shadow-lg'
          : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          ref={handleRef}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-slate-100 rounded-lg transition-colors touch-none"
        >
          <GripVertical className="w-5 h-5 text-slate-400" />
        </div>

        {/* 이미지 미리보기 */}
        <div className="relative">
          {sheet.imagePath ? (
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative w-20 h-24 rounded-lg overflow-hidden border-2 border-blue-300 cursor-pointer shadow-md">
                  <img
                    src={`/uploads/${sheet.imagePath}`}
                    alt={sheet.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-2 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent
                className="max-w-5xl bg-transparent border-none shadow-none p-0"
                showCloseButton={false}
              >
                <DialogTitle className="sr-only">{sheet.title} 미리보기</DialogTitle>
                <div className="relative flex flex-col items-center">
                  <img
                    src={`/uploads/${sheet.imagePath}`}
                    alt={sheet.title}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                  />
                  <div className="mt-4 bg-black/70 text-white px-6 py-3 rounded-full font-semibold">
                    {sheet.title}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="w-20 h-24 bg-linear-to-br from-amber-50 to-orange-100 rounded-lg flex items-center justify-center text-3xl border-2 border-slate-200">
              📄
            </div>
          )}
        </div>

        {/* 제목 편집 영역 */}
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <Input
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
                className="border-blue-500"
                placeholder="악보 제목"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onSaveTitle}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-3.5 h-3.5" />
                  저장
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCancelEdit}
                >
                  <X className="w-3.5 h-3.5" />
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="font-semibold text-slate-800">{sheet.title}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(sheet.id, sheet.title)}
                  title="제목 수정"
                  className="p-1 h-auto w-auto text-blue-600 hover:bg-blue-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="text-sm text-slate-500 mt-1">{sheet.fileName}</div>
            </>
          )}
        </div>

        <div className="text-2xl font-bold text-slate-300 min-w-10 text-center">
          {index + 1}
        </div>

        {!isEditing && (
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            }
            title="악보 삭제"
            description="이 악보를 삭제하시겠습니까?"
            confirmLabel="삭제"
            onConfirm={() => onDelete(sheet.id)}
            destructive
          />
        )}
      </div>
    </div>
  );
}

export default function WorshipEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: worshipData } = useWorship(isNew ? undefined : id);
  const { data: worshipTypes = [] } = useWorshipTypes();
  const addWorshipMutation = useAddWorship();
  const updateWorshipMutation = useUpdateWorship();
  const addSheetMutation = useAddSheet();
  const updateSheetMutation = useUpdateSheet();
  const deleteSheetMutation = useDeleteSheet();
  const reorderSheetsMutation = useReorderSheets();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [typeId, setTypeId] = useState('');
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [worshipId, setWorshipId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 기존 예배 데이터 로드
  useEffect(() => {
    if (worshipData) {
      setTitle(worshipData.title);
      setDate(worshipData.date);
      setTypeId(worshipData.typeId);
      setSheets(worshipData.sheets || []);
      setWorshipId(worshipData.id);
    }
  }, [worshipData]);

  // 새 예배일 때 기본 유형 설정
  useEffect(() => {
    if (isNew && worshipTypes.length > 0 && !typeId) {
      setTypeId(worshipTypes[0].id);
    }
  }, [isNew, worshipTypes, typeId]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    const imageFiles = files.filter((file) => allowedTypes.includes(file.type));

    if (imageFiles.length !== files.length) {
      toast.error('JPG, PNG, HEIC 이미지 파일만 업로드 가능합니다.');
    }

    if (imageFiles.length === 0) return;

    // 새 예배인데 아직 저장 안 됐으면 먼저 예배 생성
    let currentWorshipId = worshipId;
    if (!currentWorshipId) {
      if (!title.trim()) {
        toast.error('악보를 추가하려면 먼저 예배 제목을 입력해주세요.');
        return;
      }
      if (!date) {
        toast.error('악보를 추가하려면 먼저 예배 날짜를 선택해주세요.');
        return;
      }
      const worship = await addWorshipMutation.mutateAsync({ title: title.trim(), date, typeId });
      currentWorshipId = worship.id;
      setWorshipId(worship.id);
    }

    for (const file of imageFiles) {
      const sheetTitle = file.name.replace(/\.[^/.]+$/, '');
      const sheet = await addSheetMutation.mutateAsync({
        worshipId: currentWorshipId,
        file,
        title: sheetTitle,
      });
      setSheets((prev) => [...prev, sheet]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteSheet = async (sheetId: string) => {
    await deleteSheetMutation.mutateAsync(sheetId);
    setSheets((prev) => prev.filter((s) => s.id !== sheetId));
  };

  const handleEditSheetTitle = (sheetId: string, currentTitle: string) => {
    setEditingSheetId(sheetId);
    setEditingTitle(currentTitle);
  };

  const handleSaveSheetTitle = async () => {
    if (!editingSheetId) return;
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    await updateSheetMutation.mutateAsync({ id: editingSheetId, title: trimmedTitle });
    setSheets((prev) =>
      prev.map((s) => (s.id === editingSheetId ? { ...s, title: trimmedTitle } : s)),
    );
    setEditingSheetId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingSheetId(null);
    setEditingTitle('');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = async (event: any) => {
    const { source, target } = event.operation;
    if (!source || !target || source.id === target.id) return;

    const oldIndex = sheets.findIndex((s) => s.id === source.id);
    const newIndex = sheets.findIndex((s) => s.id === target.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newSheets = [...sheets];
    const [removed] = newSheets.splice(oldIndex, 1);
    newSheets.splice(newIndex, 0, removed);
    setSheets(newSheets);

    if (worshipId) {
      await reorderSheetsMutation.mutateAsync({
        worshipId,
        orderedIds: newSheets.map((s) => s.id),
      });
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('예배 제목을 입력해주세요.');
      return;
    }
    if (!date) {
      toast.error('예배 날짜를 선택해주세요.');
      return;
    }
    if (!typeId) {
      toast.error('예배 유형을 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      if (worshipId) {
        await updateWorshipMutation.mutateAsync({ id: worshipId, title: title.trim(), date, typeId });
      } else {
        await addWorshipMutation.mutateAsync({ title: title.trim(), date, typeId });
      }
      navigate('/worship-list');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">
              {isNew ? '새 예배 만들기' : '예배 편집'}
            </h1>
            <p className="text-slate-600">예배 정보와 악보를 관리하세요</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-5 h-5" />
            {saving ? '저장 중...' : '저장하기'}
          </Button>
        </div>

        {/* 예배 정보 */}
        <Card className="mb-6">
          <CardContent>
            <h2 className="text-xl font-bold text-slate-800 mb-6">예배 정보</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    예배 제목 *
                  </div>
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 2024년 1월 첫째주 주일예배"
                  className="text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    예배 날짜 *
                  </div>
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-lg appearance-none"
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
                    {worshipTypes.map((type) => (
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
                    <Button
                      asChild
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      <Link to="/worship-type-settings">
                        <Plus className="w-4 h-4" />
                        예배 유형 관리
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 악보 업로드 섹션 */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">악보 관리</h2>
                <p className="text-sm text-slate-500 mt-1">
                  드래그하여 순서를 변경하거나 제목을 수정할 수 있습니다
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload className="w-5 h-5" />
                악보 추가
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/heic,image/heif"
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
                    <li>JPG, PNG, HEIC 이미지 파일을 지원합니다</li>
                    <li>여러 파일을 한 번에 선택하여 업로드할 수 있습니다</li>
                    <li>드래그하여 악보 순서를 자유롭게 변경하세요</li>
                    <li>이미지 클릭 시 미리보기가 가능합니다</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 악보 목록 */}
            {sheets.length > 0 ? (
              <DragDropProvider onDragEnd={handleDragEnd}>
                <div className="space-y-3">
                  {sheets.map((sheet, index) => (
                    <SortableSheetItem
                      key={sheet.id}
                      sheet={sheet}
                      index={index}
                      onDelete={handleDeleteSheet}
                      onEdit={handleEditSheetTitle}
                      editingId={editingSheetId}
                      editingTitle={editingTitle}
                      onTitleChange={setEditingTitle}
                      onSaveTitle={handleSaveSheetTitle}
                      onCancelEdit={handleCancelEdit}
                    />
                  ))}
                </div>
              </DragDropProvider>
            ) : (
              <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">아직 악보가 없습니다</h3>
                <p className="text-slate-500 mb-6">악보 추가 버튼을 눌러 이미지를 업로드하세요</p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-5 h-5" />
                  악보 추가
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-linear-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-none">
            <CardContent>
              <div className="text-sm font-semibold text-blue-700 mb-1">총 악보</div>
              <div className="text-3xl font-bold text-blue-900">{sheets.length}개</div>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-green-50 to-green-100 border-2 border-green-200 shadow-none">
            <CardContent>
              <div className="text-sm font-semibold text-green-700 mb-1">예배 날짜</div>
              <div className="text-xl font-bold text-green-900">{date || '미정'}</div>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-purple-50 to-purple-100 border-2 border-purple-200 shadow-none">
            <CardContent>
              <div className="text-sm font-semibold text-purple-700 mb-1">상태</div>
              <div className="text-xl font-bold text-purple-900">
                {title && date && sheets.length > 0 ? '준비완료' : '작성중'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
