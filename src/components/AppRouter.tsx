import React from 'react';
import { Route, Routes } from 'react-router-dom';

// 실제 페이지 컴포넌트들
import { ProfileSelectPage } from '../pages/ProfileSelect';
import { WorshipListPage } from '../pages/WorshipList';
import { SongListPage } from '../pages/SongListPage';
import { ScoreViewerPage } from '../pages/ScoreViewerPage';


const CommandEditorPage = () => (
  <div className="page-container p-4">
    <h1 className="text-2xl font-bold mb-4">명령 에디터</h1>
    <p>실시간 명령을 전송하세요.</p>
  </div>
);

const AdminPage = () => (
  <div className="page-container p-4">
    <h1 className="text-2xl font-bold mb-4">관리자</h1>
    <p>시스템을 관리하세요.</p>
  </div>
);

const SettingsPage = () => (
  <div className="page-container p-4">
    <h1 className="text-2xl font-bold mb-4">설정</h1>
    <p>앱 설정을 변경하세요.</p>
  </div>
);

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
