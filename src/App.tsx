// 앱 라우터

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAppStore } from '@/store/appStore';
import { ErrorBoundary } from '@/components/shared';
import { AppLayout } from '@/app/layout/AppLayout';

// 페이지 컴포넌트 (추후 구현)
import { ProfileSelectPage } from '@/app/profile/ProfileSelectPage';
import { WorshipListPage } from '@/app/worship/WorshipListPage';
import { WorshipCreatePage } from '@/app/worship/WorshipCreatePage';
import { SongListPage } from '@/app/song/SongListPage';
import { ScoreViewerPage } from '@/app/score/ScoreViewerPage';

// 프로필 필수 라우트 가드
function RequireProfile({ children }: { children: React.ReactNode }) {
  const currentProfile = useAppStore((state) => state.currentProfile);

  if (!currentProfile) {
    return <Navigate to={ROUTES.PROFILE_SELECT} replace />;
  }

  return <>{children}</>;
}

// 예배 필수 라우트 가드
function RequireWorship({ children }: { children: React.ReactNode }) {
  const currentWorship = useAppStore((state) => state.currentWorship);

  if (!currentWorship) {
    return <Navigate to={ROUTES.WORSHIP_LIST} replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* 프로필 선택 (인증 불필요) */}
          <Route path={ROUTES.PROFILE_SELECT} element={<ProfileSelectPage />} />

          {/* 프로필 필수 영역 */}
          <Route
            element={
              <RequireProfile>
                <AppLayout />
              </RequireProfile>
            }
          >
            {/* 예배 */}
            <Route path={ROUTES.WORSHIP_LIST} element={<WorshipListPage />} />
            <Route path={ROUTES.WORSHIP_CREATE} element={<WorshipCreatePage />} />

            {/* 찬양 (예배 선택 필수) */}
            <Route
              path={ROUTES.SONG_LIST}
              element={
                <RequireWorship>
                  <SongListPage />
                </RequireWorship>
              }
            />

            {/* 악보 뷰어 */}
            <Route
              path={ROUTES.SCORE_VIEWER}
              element={
                <RequireWorship>
                  <ScoreViewerPage />
                </RequireWorship>
              }
            />
          </Route>

          {/* 기본 리다이렉트 */}
          <Route path="*" element={<Navigate to={ROUTES.PROFILE_SELECT} replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
