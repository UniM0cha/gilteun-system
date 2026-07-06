import { useMemo } from "react";
import { Link, Navigate, useParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, User, Users } from "lucide-react";
import { useProfiles, useAddProfile, useUpdateProfile, useDeleteProfile, useRoles } from "@/hooks/queries";
import { PROFILE_COLORS } from "@/lib/colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
          <Button variant="outline" size="icon" asChild>
            <Link to="/profile-setup">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{isNewProfile ? "새 프로필 추가" : "프로필 수정"}</h1>
            <p className="text-muted-foreground">프로필 정보를 입력하세요</p>
          </div>
        </div>

        <Card className="rounded-3xl p-8">
          <CardContent className="p-0">
            {/* 프로필 미리보기 */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className={`w-32 h-32 ${color} rounded-3xl flex items-center justify-center text-7xl shadow-xl`}>
                  {getRoleById(roleId)?.icon}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-card rounded-full p-2 shadow-lg">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* 이름 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-foreground mb-2">이름 *</label>
              <Input
                type="text"
                {...register("name", { validate: (v) => v.trim().length > 0 })}
                placeholder="이름을 입력하세요"
                className="text-lg"
              />
            </div>

            {/* 역할 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-foreground mb-3">역할 *</label>
              {roles.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setValue("roleId", role.id, { shouldDirty: true })}
                      className={`flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all ${
                        roleId === role.id
                          ? "bg-primary text-primary-foreground shadow-lg scale-105"
                          : "bg-muted text-foreground hover:bg-secondary"
                      }`}
                    >
                      <span className="text-2xl">{role.icon}</span>
                      <span>{role.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="w-full px-5 py-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-yellow-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5" />
                    <span className="font-semibold">역할이 없습니다</span>
                  </div>
                  <p className="text-sm mb-3">먼저 역할을 생성해주세요.</p>
                  <Button asChild size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                    <Link to="/role-management">
                      <Users className="w-4 h-4" />
                      역할 관리
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* 색상 선택 */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-foreground mb-3">배경 색상</label>
              <div className="grid grid-cols-6 gap-3">
                {PROFILE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setValue("color", c, { shouldDirty: true })}
                    className={`aspect-square ${c} rounded-xl transition-all hover:scale-110 ${
                      color === c ? "ring-4 ring-offset-4 ring-slate-400 scale-110" : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 액션 */}
            <div className="flex gap-4">
              <Button size="lg" className="flex-1" onClick={handleSave} disabled={roles.length === 0}>
                <Save className="w-5 h-5" />
                저장하기
              </Button>
              {!isNewProfile && (
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive" size="lg">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  }
                  title="프로필 삭제"
                  description="이 프로필을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                  confirmLabel="삭제"
                  onConfirm={handleDelete}
                  destructive
                />
              )}
              <Button variant="secondary" size="lg" asChild>
                <Link to="/profile-setup">취소</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
