import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
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

export default function ProfileEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useRoles();
  const addProfileMutation = useAddProfile();
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();

  const isNewProfile = id === "new";
  const existingProfile = isNewProfile ? null : profiles.find((p) => p.id === id);

  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [color, setColor] = useState("bg-blue-500");

  useEffect(() => {
    if (existingProfile) {
      setName(existingProfile.name);
      setRoleId(existingProfile.roleId);
      setColor(existingProfile.color);
    } else if (roles.length > 0 && !roleId) {
      setRoleId(roles[0].id);
    }
  }, [existingProfile, roles, roleId]);

  const getRoleById = (rid: string) => roles.find((r) => r.id === rid);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    if (isNewProfile) {
      await addProfileMutation.mutateAsync({ name: name.trim(), roleId, color });
    } else if (id) {
      await updateProfileMutation.mutateAsync({ id, name: name.trim(), roleId, color });
    }
    navigate("/profile-setup");
  };

  const handleDelete = async () => {
    if (id && !isNewProfile) {
      await deleteProfileMutation.mutateAsync(id);
      navigate("/profile-setup");
    }
  };

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
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                      onClick={() => setRoleId(role.id)}
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
                    onClick={() => setColor(c)}
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
