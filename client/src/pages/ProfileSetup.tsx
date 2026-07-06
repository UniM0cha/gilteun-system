import { Link } from "react-router";
import { ArrowLeft, Edit, Plus, Trash2, User } from "lucide-react";
import { useProfiles, useDeleteProfile, useRoles } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";

export default function ProfileSetup() {
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useRoles();
  const deleteProfileMutation = useDeleteProfile();

  const getRoleById = (roleId: string) => roles.find((r) => r.id === roleId);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
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
            <h1 className="text-3xl font-bold tracking-tight">프로필 관리</h1>
            <p className="text-muted-foreground">프로필을 추가하거나 수정하세요</p>
          </div>
          <Link to="/profile-setup/new" className={cn(buttonVariants(), "h-11")}>
            <Plus />새 프로필
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">프로필 목록 ({profiles.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            {profiles.length > 0 ? (
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex size-12 shrink-0 items-center justify-center rounded-lg text-2xl ${profile.color}`}
                      >
                        {getRoleById(profile.roleId)?.icon}
                      </div>
                      <div>
                        <div className="font-semibold">{profile.name}</div>
                        <Badge variant="secondary" className="mt-1">
                          {getRoleById(profile.roleId)?.name}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/profile-setup/${profile.id}`}
                        title="프로필 편집"
                        aria-label={`${profile.name} 프로필 편집`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11")}
                      >
                        <Edit />
                      </Link>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            title="프로필 삭제"
                            aria-label={`${profile.name} 프로필 삭제`}
                          >
                            <Trash2 />
                          </Button>
                        }
                        title="프로필 삭제"
                        description={`"${profile.name}" 프로필을 정말 삭제하시겠습니까?`}
                        onConfirm={() => deleteProfileMutation.mutate(profile.id)}
                        destructive
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={User}
                title="아직 프로필이 없습니다"
                description="새 프로필 버튼을 눌러 프로필을 만드세요"
                action={
                  <Link to="/profile-setup/new" className={cn(buttonVariants(), "h-11")}>
                    <Plus />새 프로필 추가
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
