import { useMemo } from "react";
import { Link, Navigate, useParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, User, Users } from "lucide-react";
import { useProfiles, useAddProfile, useUpdateProfile, useDeleteProfile, useRoles } from "@/hooks/queries";
import { PROFILE_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type ProfileFormValues = {
  name: string;
  roleId: string;
  color: string;
};

export default function ProfileEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data: profiles = [],
    isSuccess: profilesLoaded,
    isFetching: profilesFetching,
    isError: profilesError,
  } = useProfiles();
  const { data: roles = [] } = useRoles();
  const addProfileMutation = useAddProfile();
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();

  const isNewProfile = id === "new";
  const existingProfile = isNewProfile ? null : profiles.find((p) => p.id === id);

  // 수정 모드면 기존 프로필, 신규 모드면 roles 로드 후 첫 역할이 초기값
  const formValues = useMemo<ProfileFormValues | undefined>(() => {
    if (existingProfile) {
      return { name: existingProfile.name, roleId: existingProfile.roleId, color: existingProfile.color };
    }
    if (isNewProfile && roles.length > 0) {
      return { name: "", roleId: roles[0].id, color: "bg-blue-500" };
    }
    return undefined;
  }, [existingProfile, isNewProfile, roles]);

  const { register, handleSubmit, watch, setValue } = useForm<ProfileFormValues>({
    defaultValues: { name: "", roleId: "", color: "bg-blue-500" },
    values: formValues,
    resetOptions: { keepDirtyValues: true },
  });

  const roleId = watch("roleId");
  const color = watch("color");

  const getRoleById = (rid: string) => roles.find((r) => r.id === rid);

  const handleSave = handleSubmit(
    async (data) => {
      const payload = { name: data.name.trim(), roleId: data.roleId, color: data.color };
      if (isNewProfile) {
        await addProfileMutation.mutateAsync(payload);
      } else if (id) {
        await updateProfileMutation.mutateAsync({ id, ...payload });
      }
      navigate("/profile-setup");
    },
    () => {
      toast.error("이름을 입력해주세요.");
    },
  );

  const handleDelete = async () => {
    if (id && !isNewProfile) {
      await deleteProfileMutation.mutateAsync(id);
      navigate("/profile-setup");
    }
  };

  // 수정 모드에서 데이터 도착 전 입력을 막는다 — 하이드레이션 전 입력이 keepDirtyValues로 살아남아 서버값과 섞이는 것 방지
  if (!isNewProfile && !existingProfile) {
    // 수정 대상을 확보할 수 없으면(로드 완료 후 not-found든, 캐시 없는 조회 실패든) 목록으로 탈출 — 빈 화면 고립 방지
    if ((profilesLoaded && !profilesFetching) || profilesError) return <Navigate to="/profile-setup" replace />;
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/profile-setup"
            title="프로필 목록으로"
            aria-label="프로필 목록으로"
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-11")}
          >
            <ArrowLeft />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{isNewProfile ? "새 프로필 추가" : "프로필 수정"}</h1>
            <p className="text-muted-foreground">프로필 정보를 입력하세요</p>
          </div>
        </div>

        <Card>
          <CardContent>
            {/* 프로필 미리보기 */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className={`flex size-28 items-center justify-center rounded-xl text-6xl ${color}`}>
                  {getRoleById(roleId)?.icon}
                </div>
                <div className="absolute -bottom-2 -right-2 rounded-full border bg-card p-2 shadow-sm">
                  <User className="size-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* 이름 */}
            <div className="mb-6">
              <Label htmlFor="profile-name" className="mb-2">
                이름 *
              </Label>
              <Input
                id="profile-name"
                type="text"
                {...register("name", { validate: (v) => v.trim().length > 0 })}
                placeholder="이름을 입력하세요"
                className="h-11"
              />
            </div>

            {/* 역할 선택 */}
            <div className="mb-6">
              <Label className="mb-2">역할 *</Label>
              {roles.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setValue("roleId", role.id, { shouldDirty: true })}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-md border py-3 text-sm font-medium transition-colors ${
                        roleId === role.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background hover:bg-accent"
                      }`}
                    >
                      <span className="text-xl">{role.icon}</span>
                      <span>{role.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <Alert>
                  <Users />
                  <AlertTitle>역할이 없습니다</AlertTitle>
                  <AlertDescription>
                    <p>먼저 역할을 생성해주세요.</p>
                    <Link to="/role-management" className={cn(buttonVariants(), "mt-2 h-11")}>
                      <Users />
                      역할 관리
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* 색상 선택 */}
            <div className="mb-8">
              <Label className="mb-2">배경 색상</Label>
              <div className="grid grid-cols-6 gap-3">
                {PROFILE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setValue("color", c, { shouldDirty: true })}
                    aria-label={`색상 ${c}`}
                    className={`aspect-square min-h-11 min-w-11 rounded-md transition-shadow ${c} ${
                      color === c ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 액션 */}
            <div className="flex gap-3">
              <Button size="lg" className="h-11 flex-1" onClick={handleSave} disabled={roles.length === 0}>
                <Save />
                저장하기
              </Button>
              {!isNewProfile && (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="destructive"
                      size="lg"
                      className="h-11"
                      title="프로필 삭제"
                      aria-label={`${name} 프로필 삭제`}
                    >
                      <Trash2 />
                    </Button>
                  }
                  title="프로필 삭제"
                  description={`"${name}" 프로필을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
                  confirmLabel="삭제"
                  onConfirm={handleDelete}
                  destructive
                />
              )}
              <Link to="/profile-setup" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}>
                취소
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
