import { useState, useEffect, useRef, useMemo, ChangeEvent } from "react";
import { Link, Navigate, useParams, useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { isAxiosError } from "axios";
import { toast } from "sonner";
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
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  useWorship,
  useWorshipTypes,
  useAddWorship,
  useUpdateWorship,
  useAddSheet,
  useUpdateSheet,
  useDeleteSheet,
  useReorderSheets,
} from "@/hooks/queries";
import type { Sheet } from "@/types";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sheet.id });

  const isEditing = editingId === sheet.id;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-lg border bg-card p-3 sm:p-4 transition-colors ${
        isDragging ? "opacity-30 border-dashed" : ""
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing min-h-11 min-w-11 shrink-0 flex items-center justify-center hover:bg-accent rounded-md transition-colors touch-none"
        >
          <GripVertical className="size-5 text-muted-foreground" />
        </div>

        {/* 이미지 미리보기 */}
        <div className="relative shrink-0">
          {/* 폰: 번호 칸 대신 썸네일 모서리 배지로 표시(데스크톱은 우측 번호 칸 유지) */}
          <div className="sm:hidden absolute top-1 left-1 z-10 min-w-5 h-5 px-1 rounded-md bg-black/70 text-white text-xs font-bold flex items-center justify-center">
            {index + 1}
          </div>
          {sheet.imagePath ? (
            <Dialog>
              <DialogTrigger
                render={
                  <div className="relative w-16 h-20 sm:w-20 sm:h-24 rounded-md overflow-hidden border cursor-pointer" />
                }
                nativeButton={false}
              >
                <img src={`/uploads/${sheet.imagePath}`} alt={sheet.title} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-2 flex items-center justify-center">
                  <Eye className="size-4 text-white" />
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-5xl bg-transparent border-none shadow-none p-0" showCloseButton={false}>
                <DialogTitle className="sr-only">{sheet.title} 미리보기</DialogTitle>
                <DialogClose className="sr-only">닫기</DialogClose>
                <div className="relative flex flex-col items-center">
                  <img
                    src={`/uploads/${sheet.imagePath}`}
                    alt={sheet.title}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-lg"
                  />
                  <div className="mt-4 rounded-full bg-black/70 px-6 py-3 font-medium text-white">{sheet.title}</div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="w-16 h-20 sm:w-20 sm:h-24 bg-muted rounded-md flex items-center justify-center text-3xl border">
              📄
            </div>
          )}
        </div>

        {/* 제목 편집 영역 */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                type="text"
                value={editingTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSaveTitle();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    onCancelEdit();
                  }
                }}
                autoFocus
                className="h-11"
                placeholder="악보 제목"
              />
              <div className="flex gap-2">
                <Button className="h-11" onClick={onSaveTitle}>
                  <Check />
                  저장
                </Button>
                <Button variant="outline" className="h-11" onClick={onCancelEdit}>
                  <X />
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="font-medium line-clamp-2">{sheet.title}</div>
              <div className="text-sm text-muted-foreground mt-1 truncate">{sheet.fileName}</div>
            </>
          )}
        </div>

        <div className="hidden sm:block text-xl font-semibold text-muted-foreground min-w-10 shrink-0 text-center">
          {index + 1}
        </div>

        {/* 수정·삭제 액션 묶음 — 같은 행 직계 자식 + 동일 크기로 세로 정렬 일치 */}
        {!isEditing && (
          <div className="flex items-center shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(sheet.id, sheet.title)}
              title="제목 수정"
              aria-label={`${sheet.title} 제목 수정`}
              className="size-11"
            >
              <Pencil />
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  title="악보 삭제"
                  aria-label={`${sheet.title} 삭제`}
                >
                  <Trash2 />
                </Button>
              }
              title="악보 삭제"
              description={`"${sheet.title}" 악보를 삭제하시겠습니까?`}
              confirmLabel="삭제"
              onConfirm={() => onDelete(sheet.id)}
              destructive
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SheetDragPreview({ sheet }: { sheet: Sheet }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-md">
      <div className="flex items-center gap-4">
        <div className="p-2">
          <GripVertical className="size-5 text-muted-foreground" />
        </div>
        {sheet.imagePath ? (
          <div className="w-20 h-24 rounded-md overflow-hidden border">
            <img src={`/uploads/${sheet.imagePath}`} alt={sheet.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-20 h-24 bg-muted rounded-md flex items-center justify-center text-3xl border">📄</div>
        )}
        <div className="flex-1">
          <div className="font-medium line-clamp-2">{sheet.title}</div>
          <div className="text-sm text-muted-foreground mt-1 truncate">{sheet.fileName}</div>
        </div>
      </div>
    </div>
  );
}

type WorshipFormValues = {
  title: string;
  date: string;
  typeId: string;
};

export default function WorshipEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: worshipData, error: worshipError } = useWorship(isNew ? undefined : id);
  // 404는 리소스가 삭제된 것 — persisted 캐시가 남아 있어도 편집을 계속하면 안 됨
  const worshipNotFound = isAxiosError(worshipError) && worshipError.response?.status === 404;
  const { data: worshipTypes = [] } = useWorshipTypes();
  const addWorshipMutation = useAddWorship();
  const updateWorshipMutation = useUpdateWorship();
  const addSheetMutation = useAddSheet();
  const updateSheetMutation = useUpdateSheet();
  const deleteSheetMutation = useDeleteSheet();
  const reorderSheetsMutation = useReorderSheets();

  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [worshipId, setWorshipId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 수정 모드면 기존 예배, 신규 모드면 유형 로드 후 첫 유형이 초기값
  const formValues = useMemo<WorshipFormValues | undefined>(() => {
    if (worshipData) {
      return { title: worshipData.title, date: worshipData.date, typeId: worshipData.typeId };
    }
    if (isNew && worshipTypes.length > 0) {
      return { title: "", date: "", typeId: worshipTypes[0].id };
    }
    return undefined;
  }, [worshipData, isNew, worshipTypes]);

  const { register, handleSubmit, control, getValues } = useForm<WorshipFormValues>({
    defaultValues: { title: "", date: "", typeId: "" },
    values: formValues,
    resetOptions: { keepDirtyValues: true },
  });

  // 기존 예배의 악보 목록 로드 (악보 리스트는 서버 상태와 동기화 유지가 의도된 동작)
  useEffect(() => {
    if (worshipData) {
      setSheets(worshipData.sheets || []);
      setWorshipId(worshipData.id);
    }
  }, [worshipData]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = ["image/jpeg", "image/png", "image/heic", "image/heif"];
    const imageFiles = files
      .filter((file) => allowedTypes.includes(file.type))
      .sort((a, b) => a.lastModified - b.lastModified);

    if (imageFiles.length !== files.length) {
      toast.error("JPG, PNG, HEIC 이미지 파일만 업로드 가능합니다.");
    }

    if (imageFiles.length === 0) return;

    // 새 예배인데 아직 저장 안 됐으면 먼저 예배 생성
    let currentWorshipId = worshipId;
    if (!currentWorshipId) {
      const { title, date, typeId } = getValues();
      if (!title.trim()) {
        toast.error("악보를 추가하려면 먼저 예배 제목을 입력해주세요.");
        return;
      }
      if (!date) {
        toast.error("악보를 추가하려면 먼저 예배 날짜를 선택해주세요.");
        return;
      }
      if (!typeId) {
        toast.error("악보를 추가하려면 먼저 예배 유형을 선택해주세요.");
        return;
      }
      const worship = await addWorshipMutation.mutateAsync({ title: title.trim(), date, typeId });
      currentWorshipId = worship.id;
      setWorshipId(worship.id);
    }

    for (const file of imageFiles) {
      const sheetTitle = file.name.replace(/\.[^/.]+$/, "");
      const sheet = await addSheetMutation.mutateAsync({
        worshipId: currentWorshipId,
        file,
        title: sheetTitle,
      });
      setSheets((prev) => [...prev, sheet]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
      toast.error("제목을 입력해주세요.");
      return;
    }
    await updateSheetMutation.mutateAsync({ id: editingSheetId, title: trimmedTitle });
    setSheets((prev) => prev.map((s) => (s.id === editingSheetId ? { ...s, title: trimmedTitle } : s)));
    setEditingSheetId(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingSheetId(null);
    setEditingTitle("");
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sheets.findIndex((s) => s.id === active.id);
    const newIndex = sheets.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newSheets = arrayMove(sheets, oldIndex, newIndex);
    setSheets(newSheets);

    if (worshipId) {
      await reorderSheetsMutation.mutateAsync({
        worshipId,
        orderedIds: newSheets.map((s) => s.id),
      });
    }
  };

  const handleSave = handleSubmit(
    async (data) => {
      // 유형 셀렉트는 worshipTypes가 비면 마운트되지 않아 rules 검증이 등록되지 않으므로 여기서 직접 검증
      if (!data.typeId) {
        toast.error("예배 유형을 선택해주세요.");
        return;
      }
      setSaving(true);
      try {
        const payload = { title: data.title.trim(), date: data.date, typeId: data.typeId };
        if (worshipId) {
          await updateWorshipMutation.mutateAsync({ id: worshipId, ...payload });
        } else {
          await addWorshipMutation.mutateAsync(payload);
        }
        navigate(-1);
      } finally {
        setSaving(false);
      }
    },
    (errors) => {
      if (errors.title) toast.error("예배 제목을 입력해주세요.");
      else if (errors.date) toast.error("예배 날짜를 선택해주세요.");
    },
  );

  // 수정 모드 가드 — 하이드레이션 전 입력이 keepDirtyValues로 살아남아 서버값과 섞이는 것 방지
  if (!isNew) {
    // 삭제된 예배는 캐시된 데이터가 있어도 나간다; 일시적 오류(500/오프라인)는 캐시로 편집 유지
    if (worshipNotFound) return <Navigate to="/worship-list" replace />;
    if (!worshipData) {
      if (worshipError) return <Navigate to="/worship-list" replace />;
      return <div className="min-h-screen bg-background" />;
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            onClick={() => navigate(-1)}
            title="뒤로"
            aria-label="뒤로"
          >
            <ArrowLeft />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
              {isNew ? "새 예배 만들기" : "예배 편집"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">예배 정보와 악보를 관리하세요</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="h-11 shrink-0">
            <Save />
            <span className="hidden sm:inline">{saving ? "저장 중..." : "예배 정보 저장"}</span>
            <span className="sm:hidden">{saving ? "저장 중" : "정보 저장"}</span>
          </Button>
        </div>

        {/* 예배 정보 */}
        <Card className="mb-6">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-lg">예배 정보</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="worship-title" className="mb-2">
                  <FileText className="size-4" />
                  예배 제목 *
                </Label>
                <Input
                  id="worship-title"
                  type="text"
                  {...register("title", { validate: (v) => v.trim().length > 0 })}
                  placeholder="예: 2024년 1월 첫째주 주일예배"
                  className="h-11"
                />
              </div>

              <div>
                <Label htmlFor="worship-date" className="mb-2">
                  <Calendar className="size-4" />
                  예배 날짜 *
                </Label>
                <Input
                  id="worship-date"
                  type="date"
                  {...register("date", { required: true })}
                  className="h-11 appearance-none"
                />
              </div>

              <div>
                <Label className="mb-2">
                  <Tag className="size-4" />
                  예배 유형 *
                </Label>
                {worshipTypes.length > 0 ? (
                  <Controller
                    control={control}
                    name="typeId"
                    render={({ field }) => (
                      <Select
                        items={Object.fromEntries(worshipTypes.map((t) => [t.id, t.name]))}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full data-[size=default]:h-11">
                          <SelectValue placeholder="예배 유형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {worshipTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id} className="min-h-11">
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : (
                  <Alert>
                    <Tag />
                    <AlertTitle>예배 유형이 없습니다</AlertTitle>
                    <AlertDescription>
                      <p>먼저 예배 유형을 생성해주세요.</p>
                      <Link to="/worship-type-settings" className={cn(buttonVariants(), "mt-2 h-11")}>
                        <Plus />
                        예배 유형 관리
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 악보 업로드 섹션 */}
        <Card className="mb-6">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-lg">악보 관리</CardTitle>
            <CardDescription>드래그하여 순서를 변경하거나 제목을 수정할 수 있습니다</CardDescription>
            <CardAction>
              <Button className="h-11" onClick={() => fileInputRef.current?.click()}>
                <Upload />
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
            </CardAction>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {/* 업로드 안내 */}
            <Alert className="mb-6">
              <ImageIcon />
              <AlertTitle>악보 업로드 안내</AlertTitle>
              <AlertDescription>
                <ul className="space-y-1">
                  <li>악보 추가·삭제·순서 변경은 즉시 저장됩니다 (상단 "예배 정보 저장"과 무관)</li>
                  <li>JPG, PNG, HEIC 이미지 파일을 지원합니다</li>
                  <li>여러 파일을 한 번에 선택하여 업로드할 수 있습니다</li>
                  <li>드래그하여 악보 순서를 자유롭게 변경하세요</li>
                  <li>이미지 클릭 시 미리보기가 가능합니다</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* 악보 목록 */}
            {sheets.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sheets.map((s) => s.id)} strategy={verticalListSortingStrategy}>
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
                </SortableContext>
                <DragOverlay>
                  {activeId ? <SheetDragPreview sheet={sheets.find((s) => s.id === activeId)!} /> : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <EmptyState
                icon={Upload}
                title="아직 악보가 없습니다"
                description="악보 추가 버튼을 눌러 이미지를 업로드하세요"
                action={
                  <Button className="h-11" onClick={() => fileInputRef.current?.click()}>
                    <Upload />
                    악보 추가
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
