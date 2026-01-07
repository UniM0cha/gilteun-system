// 앱 레이아웃 컴포넌트

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Music, Settings, LogOut, ChevronLeft } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { ROUTES } from '@/constants/routes';
import { PROFILE_COLORS } from '@/constants/config';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProfile, currentWorship, clearProfile, clearWorship } = useAppStore();

  // 뒤로가기 핸들러
  const handleBack = () => {
    if (location.pathname.includes('/songs') || location.pathname.includes('/score')) {
      clearWorship();
      navigate(ROUTES.WORSHIP_LIST);
    } else if (location.pathname.includes('/worship')) {
      navigate(ROUTES.WORSHIP_LIST);
    }
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    clearWorship();
    clearProfile();
    navigate(ROUTES.PROFILE_SELECT);
  };

  // 현재 페이지 타이틀
  const getPageTitle = () => {
    if (location.pathname.includes('/score')) return '악보';
    if (location.pathname.includes('/songs')) return currentWorship?.title || '찬양 목록';
    if (location.pathname.includes('/worship/create')) return '예배 만들기';
    if (location.pathname.includes('/worship')) return '예배 목록';
    return '';
  };

  const showBackButton = location.pathname !== ROUTES.WORSHIP_LIST;
  const profileColor = currentProfile?.color
    ? PROFILE_COLORS.find((c) => c.value === currentProfile.color)?.bg || 'bg-gray-500'
    : 'bg-gray-500';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="safe-top sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4">
          {/* 왼쪽: 뒤로가기 + 타이틀 */}
          <div className="flex items-center gap-2">
            {showBackButton && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
          </div>

          {/* 오른쪽: 프로필 */}
          <div className="flex items-center gap-3">
            {currentProfile && (
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm text-white',
                    profileColor
                  )}
                >
                  {currentProfile.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">{currentProfile.name}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="로그아웃">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* 하단 네비게이션 (선택적) */}
      <nav className="safe-bottom fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white md:hidden">
        <div className="flex h-16 items-center justify-around">
          <NavLink to={ROUTES.WORSHIP_LIST} icon={Home} label="예배" />
          <NavLink to={ROUTES.SONG_LIST} icon={Music} label="찬양" disabled={!currentWorship} />
          <NavLink to="/settings" icon={Settings} label="설정" />
        </div>
      </nav>
    </div>
  );
}

// 네비게이션 링크 컴포넌트
interface NavLinkProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}

function NavLink({ to, icon: Icon, label, disabled }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  if (disabled) {
    return (
      <div className="flex flex-col items-center gap-1 text-gray-300">
        <Icon className="h-5 w-5" />
        <span className="text-xs">{label}</span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col items-center gap-1 transition-colors',
        isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </Link>
  );
}
