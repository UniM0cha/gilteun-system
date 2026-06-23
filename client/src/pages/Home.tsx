import { Link, useNavigate } from "react-router";
import { Plus, UserCircle, Settings, Tag, Users, LogOut } from "lucide-react";
import { useProfiles, useRoles } from "@/hooks/queries";
import { useAuthStatus, useLogout } from "@/hooks/queries/useAuth";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const quickLinks = [
  { to: "/profile-setup", icon: UserCircle, label: "프로필 관리" },
  { to: "/role-management", icon: Users, label: "역할 관리" },
  { to: "/command-setup", icon: Settings, label: "명령 설정" },
  { to: "/worship-type-settings", icon: Tag, label: "예배 유형 관리" },
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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="relative text-center mb-12">
          {authStatus?.required && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 text-muted-foreground hover:text-foreground"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          )}
          <img src="/pwa-192x192.png" alt="길튼 시스템" className="mx-auto w-24 h-24 rounded-3xl mb-6 shadow-sm" />
          <h1 className="text-5xl font-bold text-foreground mb-3 tracking-tight">길튼 시스템</h1>
          <p className="text-xl text-muted-foreground">예배 찬양 지원 시스템</p>
        </div>

        {/* 프로필 선택 */}
        <Card className="rounded-2xl mb-6">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">프로필 선택</h2>
              <Button asChild>
                <Link to="/profile-setup/new">
                  <Plus className="w-5 h-5" />
                  <span className="font-semibold">새 프로필</span>
                </Link>
              </Button>
            </div>

            {profiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map((profile) => {
                  const role = getRoleById(profile.roleId);
                  return (
                    <button
                      key={profile.id}
                      onClick={() => handleProfileSelect(profile.id)}
                      className="group relative bg-muted rounded-2xl p-6 hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-primary/40 active:scale-95 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-16 h-16 ${profile.color} rounded-2xl flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform`}
                        >
                          {role?.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-foreground mb-1">{profile.name}</h3>
                          <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold">
                            {role?.name}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted rounded-2xl border-2 border-dashed border-border">
                <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">프로필이 없습니다</h3>
                <p className="text-muted-foreground mb-6">먼저 프로필을 생성해주세요</p>
                <Button asChild>
                  <Link to="/profile-setup/new">
                    <Plus className="w-5 h-5" />
                    프로필 만들기
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 빠른 설정 */}
        <div className="grid grid-cols-2 gap-4">
          {quickLinks.map(({ to, icon: Icon, label }) => (
            <Button
              key={to}
              asChild
              variant="ghost"
              className="w-full p-6 h-auto rounded-2xl bg-card shadow-sm border border-border hover:bg-accent"
            >
              <Link to={to}>
                <Icon className="w-6 h-6 text-primary" />
                <span className="text-lg font-semibold text-foreground">{label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
