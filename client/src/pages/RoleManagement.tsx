import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Trash2, Save, AlertCircle, Users } from "lucide-react";
import { useRoles, useAddRole, useUpdateRole, useDeleteRole } from "@/hooks/queries";
import { useProfiles } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";

type RoleFormValues = { name: string; icon: string };

export default function RoleManagement() {
  const { data: roles = [] } = useRoles();
  const { data: profiles = [] } = useProfiles();
  const addRoleMutation = useAddRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { register, handleSubmit, reset, watch } = useForm<RoleFormValues>({
    defaultValues: { name: "", icon: "" },
  });
  const nameValue = watch("name");
  const iconValue = watch("icon");

  const isRoleInUse = (roleId: string) => profiles.some((p) => p.roleId === roleId);

  const openAdd = () => {
    setEditingId(null);
    reset({ name: "", icon: "" });
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    const role = roles.find((r) => r.id === id);
    if (role) {
      setEditingId(id);
      // keepDefaultValues: reset(values)가 defaultValues를 교체해 이후 빈 reset()이 이 값으로 복원되는 롤백 버그 방지
      reset({ name: role.name, icon: role.icon }, { keepDefaultValues: true });
      setDialogOpen(true);
    }
  };

  const handleSave = handleSubmit(async (data) => {
    if (editingId) {
      await updateRoleMutation.mutateAsync({ id: editingId, name: data.name, icon: data.icon });
    } else {
      await addRoleMutation.mutateAsync({ name: data.name, icon: data.icon });
    }
    setDialogOpen(false);
    setEditingId(null);
    reset({ name: "", icon: "" });
  });

  const handleDelete = async (id: string) => {
    if (isRoleInUse(id)) {
      toast.error("이 역할을 사용하는 프로필이 있습니다. 먼저 프로필의 역할을 변경해주세요.");
      return;
    }
    await deleteRoleMutation.mutateAsync(id);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
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
            <h1 className="text-3xl font-bold tracking-tight">역할 관리</h1>
            <p className="text-muted-foreground">팀원의 역할을 추가하고 관리하세요</p>
          </div>
          <Button className="h-11" onClick={openAdd}>
            <Plus />새 역할 추가
          </Button>
        </div>

        {/* 추가/수정 다이얼로그 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "역할 수정" : "새 역할 추가"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role-name" className="mb-2">
                  역할 이름
                </Label>
                <Input
                  id="role-name"
                  type="text"
                  {...register("name", { validate: (v) => v.trim().length > 0 })}
                  placeholder="예: 기타, 드럼, 보컬..."
                  className="h-11"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="role-icon" className="mb-2">
                  이모지 아이콘
                </Label>
                <Input
                  id="role-icon"
                  type="text"
                  {...register("icon", { validate: (v) => v.trim().length > 0 })}
                  className="h-11 text-center text-xl"
                  placeholder="🎸"
                  maxLength={2}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" className="h-11" />}>취소</DialogClose>
              <Button className="h-11" onClick={handleSave} disabled={!nameValue?.trim() || !iconValue?.trim()}>
                <Save />
                저장하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 역할 목록 */}
        {roles.length > 0 ? (
          <div className="space-y-3">
            {roles.map((role) => {
              const inUse = isRoleInUse(role.id);
              return (
                <Card key={role.id}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-2xl">
                          {role.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold">{role.name}</h3>
                          {inUse && (
                            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                              <AlertCircle className="size-4" />
                              사용 중
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-11"
                          onClick={() => openEdit(role.id)}
                          title="역할 수정"
                          aria-label={`${role.name} 역할 수정`}
                        >
                          <Edit />
                        </Button>
                        {inUse ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            disabled
                            title="사용 중인 역할은 삭제할 수 없습니다"
                            aria-label={`${role.name} 역할 삭제 (사용 중이라 불가)`}
                          >
                            <Trash2 />
                          </Button>
                        ) : (
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-11"
                                title="역할 삭제"
                                aria-label={`${role.name} 역할 삭제`}
                              >
                                <Trash2 />
                              </Button>
                            }
                            title="역할 삭제"
                            description={`"${role.name}" 역할을 삭제하시겠습니까?`}
                            confirmLabel="삭제"
                            onConfirm={() => handleDelete(role.id)}
                            destructive
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="아직 역할이 없습니다"
            description="새 역할 추가 버튼을 눌러 역할을 만드세요"
            action={
              <Button className="h-11" onClick={openAdd}>
                <Plus />새 역할 추가
              </Button>
            }
          />
        )}

        {roles.length > 0 && (
          <Card className="mt-6">
            <CardContent>
              <div className="text-sm text-muted-foreground mb-1">전체 역할</div>
              <div className="text-3xl font-bold">{roles.length}개</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
