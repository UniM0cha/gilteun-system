import React from 'react';
import { Route, Routes } from 'react-router-dom';

// 실제 페이지 컴포넌트들
import { ProfileSelectPage } from '../pages/ProfileSelect';
import { WorshipListPage } from '../pages/WorshipList';
import { SongListPage } from '../pages/SongListPage';
import { ScoreViewerPage } from '../pages/ScoreViewerPage';
import { CommandEditorPage } from '../pages/CommandEditorPage';
import { AdminPage } from '../pages/AdminPage';
import { SettingsPage } from '../pages/SettingsPage';

/**
 * 앱 라우터 - React Router 기반 URL 라우팅
 * HashRouter 사용 (Electron file:// 프로토콜 호환)
 */
export const AppRouter: React.FC = () => {
  return (
    <main className="app-main">
      <Routes>
        {/* 루트 페이지 - 프로필 선택 */}
        <Route path="/" element={<ProfileSelectPage />} />

        {/* 예배 목록 */}
        <Route path="/worship" element={<WorshipListPage />} />

        {/* 특정 예배의 찬양 목록 */}
        <Route path="/worship/:worshipId" element={<SongListPage />} />

        {/* 특정 찬양의 악보 뷰어 */}
        <Route path="/worship/:worshipId/song/:songId" element={<ScoreViewerPage />} />

        {/* 명령 에디터 */}
        <Route path="/command" element={<CommandEditorPage />} />

        {/* 관리자 페이지 */}
        <Route path="/admin" element={<AdminPage />} />

        {/* 설정 페이지 */}
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </main>
  );
};
