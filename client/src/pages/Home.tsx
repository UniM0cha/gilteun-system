import { Link, useNavigate } from "react-router";
import { Plus, UserCircle, Settings, Tag, Users, LogOut, MonitorSmartphone } from "lucide-react";
import { useProfiles, useRoles } from "@/hooks/queries";
import { useAuthStatus, useLogout } from "@/hooks/queries/useAuth";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";

const quickLinks = [
  { to: "/profile-setup", icon: UserCircle, label: "프로필 관리" },
  { to: "/role-management", icon: Users, label: "역할 관리" },
  { to: "/command-setup", icon: Settings, label: "명령 설정" },
  { to: "/worship-type-settings", icon: Tag, label: "예배 유형 관리" },
  { to: "/device-settings", icon: MonitorSmartphone, label: "기기 설정" },
];

export default function Home() {
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useRoles();
  const { data: authStatus } = useAuthStatus();
  const logout = useLogout();
  const setCurrentProfile = useAppStore((s) => s.setCurrentProfile);
  const navigate = useNavigate();

  const getRoleById = (roleId: string) => roles.find((r) => r.id === roleId);

  const handleProfileSelect = (profileId: string) => {
    setCurrentProfile(profileId);
    navigate("/worship-list");
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="relative text-center mb-10">
          {authStatus?.required && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 size-11 text-muted-foreground"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              title="로그아웃"
              aria-label="로그아웃"
            >
              <LogOut />
            </Button>
          )}
          <img src="/pwa-192x192.png" alt="길튼 시스템" className="mx-auto w-20 h-20 rounded-xl mb-4 border" />
          <h1 className="text-3xl font-bold tracking-tight mb-1">길튼 시스템</h1>
          <p className="text-muted-foreground">예배 찬양 지원 시스템</p>
        </div>

        {/* 프로필 선택 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">프로필 선택</CardTitle>
            <CardAction>
              <Link to="/profile-setup/new" className={cn(buttonVariants(), "h-11")}>
                <Plus />새 프로필
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {profiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {profiles.map((profile) => {
                  const role = getRoleById(profile.roleId);
                  return (
                    <button
                      key={profile.id}
                      onClick={() => handleProfileSelect(profile.id)}
                      className="flex items-center gap-4 rounded-lg border bg-card p-4 text-left shadow-xs transition-colors hover:bg-accent"
                    >
                      <div
                        className={`flex size-12 shrink-0 items-center justify-center rounded-lg text-2xl ${profile.color}`}
                      >
                        {role?.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{profile.name}</h3>
                        <Badge variant="secondary" className="mt-1">
                          {role?.name}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={UserCircle}
                title="프로필이 없습니다"
                description="먼저 프로필을 생성해주세요"
                action={
                  <Link to="/profile-setup/new" className={cn(buttonVariants(), "h-11")}>
                    <Plus />
                    프로필 만들기
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* 관리 — 프로필 선택보다 낮은 보조 영역으로 분리 (경계는 유지) */}
        <div className="mt-10 border-t pt-5">
          <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">관리</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(buttonVariants({ variant: "outline" }), "h-auto justify-start gap-2 px-3 py-2.5")}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
