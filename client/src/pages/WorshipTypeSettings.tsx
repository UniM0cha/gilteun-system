import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { ArrowLeft, Plus, Edit, Trash2, Save, Tag } from "lucide-react";
import { useWorshipTypes, useAddWorshipType, useUpdateWorshipType, useDeleteWorshipType } from "@/hooks/queries";
import { COLOR_OPTIONS, getColorOption } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";

type WorshipTypeFormValues = { name: string; color: string };

export default function WorshipTypeSettings() {
  const { data: worshipTypes = [] } = useWorshipTypes();
  const addMutation = useAddWorshipType();
  const updateMutation = useUpdateWorshipType();
  const deleteMutation = useDeleteWorshipType();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const { register, handleSubmit, reset, watch, setValue } = useForm<WorshipTypeFormValues>({
    defaultValues: { name: "", color: "blue" },
  });
  const nameValue = watch("name");
  const colorValue = watch("color");

  const handleEdit = (type: { id: string; name: string; color: string }) => {
    setEditingTypeId(type.id);
    // keepDefaultValues: reset(values)가 defaultValues를 교체해 이후 빈 reset()이 이 값으로 복원되는 롤백 버그 방지
    reset({ name: type.name, color: type.color }, { keepDefaultValues: true });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingTypeId(null);
    reset({ name: "", color: "blue" });
    setDialogOpen(true);
  };

  const handleSave = handleSubmit(async (data) => {
    if (editingTypeId) {
      await updateMutation.mutateAsync({ id: editingTypeId, name: data.name.trim(), color: data.color });
    } else {
      await addMutation.mutateAsync({ name: data.name.trim(), color: data.color });
    }
    setDialogOpen(false);
    setEditingTypeId(null);
    reset({ name: "", color: "blue" });
  });

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            title="홈으로"
            aria-label="홈으로"
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-11")}
          >
            <ArrowLeft />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">예배 유형 관리</h1>
            <p className="text-muted-foreground">예배 유형을 추가하고 관리하세요</p>
          </div>
          <Button className="h-11" onClick={handleAdd}>
            <Plus />새 유형 추가
          </Button>
        </div>

        {/* 추가/수정 다이얼로그 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTypeId ? "예배 유형 수정" : "새 예배 유형 추가"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label htmlFor="type-name" className="mb-2">
                  예배 유형 이름 *
                </Label>
                <Input
                  id="type-name"
                  type="text"
                  {...register("name", { validate: (v) => v.trim().length > 0 })}
                  placeholder="예: 주일 1부 예배"
                  className="h-11"
                  autoFocus
                />
              </div>
              <div>
                <Label className="mb-2">색상 선택</Label>
                <div className="grid grid-cols-5 gap-3">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setValue("color", c.name, { shouldDirty: true })}
                      aria-label={`색상 ${c.name}`}
                      className={`size-11 rounded-md transition-shadow ${c.bg} ${
                        colorValue === c.name ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2">미리보기</Label>
                <Badge className={`text-white ${getColorOption(colorValue)?.bg || "bg-blue-500"}`}>
                  {nameValue || "예배 유형 이름"}
                </Badge>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" className="h-11" />}>취소</DialogClose>
              <Button className="h-11" onClick={handleSave} disabled={!nameValue?.trim()}>
                <Save />
                저장하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 유형 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">현재 예배 유형 ({worshipTypes.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            {worshipTypes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {worshipTypes.map((type) => (
                  <div key={type.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <Badge className={`text-white ${getColorOption(type.color)?.bg || "bg-blue-500"}`}>
                        {type.name}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-11"
                          onClick={() => handleEdit(type)}
                          title="예배 유형 수정"
                          aria-label={`${type.name} 예배 유형 수정`}
                        >
                          <Edit />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-11"
                              title="예배 유형 삭제"
                              aria-label={`${type.name} 예배 유형 삭제`}
                            >
                              <Trash2 />
                            </Button>
                          }
                          title="예배 유형 삭제"
                          description={`"${type.name}" 예배 유형을 삭제하시겠습니까?`}
                          confirmLabel="삭제"
                          onConfirm={() => handleDelete(type.id)}
                          destructive
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Tag}
                title="아직 예배 유형이 없습니다"
                description="새 유형 추가 버튼을 눌러 예배 유형을 만드세요"
                action={
                  <Button className="h-11" onClick={handleAdd}>
                    <Plus />새 유형 추가
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
