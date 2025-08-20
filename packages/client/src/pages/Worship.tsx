import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { ScoreViewer } from '../components/score/ScoreViewer';
import { ScoreNavigation } from '../components/score/ScoreNavigation';
import { DrawingToolbar } from '../components/score/DrawingToolbar';
import { CommandOverlay } from '../components/command/CommandOverlay';
import { CommandPanel } from '../components/command/CommandPanel';
import { CommandTemplateManager } from '../components/command/CommandTemplateManager';
import { useProfile } from '../hooks/useProfile';
import { useSocket } from '../hooks/useSocket';
import { useDrawing } from '../hooks/useDrawing';
import { useCommand } from '../hooks/useCommand';
import { useNavigate } from 'react-router-dom';
import type { Score } from '@gilteun/shared';

export const Worship = () => {
  const { currentUser, getCurrentInstrument } = useProfile();
  const { connect, socketService } = useSocket();
  const navigate = useNavigate();
  const currentInstrument = getCurrentInstrument();

  // 임시 악보 데이터 (Phase 3 테스트용)
  const [currentScore] = useState<Score>({
    id: 'score_1',
    worshipId: 'worship_1',
    title: '테스트 악보',
    filePath: '/test-score.png',
    orderIndex: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 3; // 임시값

  // 드로잉 hook 사용
  const {
    drawingEvents,
    isDrawingMode,
    toolSettings,
    viewport,
    sendDrawingEvent,
    toggleDrawingMode,
    updateToolSettings,
    updateViewport
  } = useDrawing({
    scoreId: currentScore.id,
    currentPage,
    userId: currentUser?.id || '',
    isConnected: socketService?.connected || false
  });

  // 명령 hook 사용
  const {
    commands,
    commandTemplates,
    sendCommand,
    expireCommand,
    addCommandTemplate,
    updateCommandTemplate,
    deleteCommandTemplate
  } = useCommand({
    userId: currentUser?.id || '',
    userName: currentUser?.name || '',
    userInstrument: currentInstrument?.name || '',
    isConnected: socketService?.connected || false
  });

  // 템플릿 관리 모드
  const [isManagingTemplates, setIsManagingTemplates] = useState(false);


  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    // Socket 연결 시도
    connect();

    // 예배 참가 (임시로 고정된 예배 ID 사용)
    const worshipId = 'worship_1';
    if (socketService.connected) {
      socketService.joinWorship(currentUser.id, worshipId);
    }
  }, [currentUser, connect, navigate, socketService]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold">길튼 시스템</h1>
              <span className="text-gray-500">•</span>
              <span className="text-gray-600">예배 진행 중</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <ConnectionStatus />
              {currentInstrument && (
                <span className="text-xl">{currentInstrument.icon}</span>
              )}
              <span className="text-sm font-medium">{currentUser.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
              >
                나가기
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 좌측 네비게이션 */}
          <div className="lg:col-span-1 space-y-4">
            <ScoreNavigation
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              viewport={viewport}
              onViewportChange={updateViewport}
            />
            
            <DrawingToolbar
              toolSettings={toolSettings}
              onToolSettingsChange={updateToolSettings}
              isDrawingMode={isDrawingMode}
              onDrawingModeChange={toggleDrawingMode}
            />

            {/* 명령 시스템 */}
            {isManagingTemplates ? (
              <CommandTemplateManager
                templates={commandTemplates}
                onAdd={addCommandTemplate}
                onUpdate={updateCommandTemplate}
                onDelete={deleteCommandTemplate}
                onReorder={(templateIds) => {
                  // TODO: 순서 변경 구현
                  console.log('Reorder templates:', templateIds);
                }}
              />
            ) : (
              <CommandPanel
                userRole={currentUser?.role || 'session'}
                onSendCommand={sendCommand}
                commandTemplates={commandTemplates}
                onManageTemplates={() => setIsManagingTemplates(true)}
              />
            )}

            {isManagingTemplates && (
              <Button
                variant="outline"
                onClick={() => setIsManagingTemplates(false)}
                className="w-full"
              >
                명령 패널로 돌아가기
              </Button>
            )}
          </div>

          {/* 중앙 악보 영역 */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{currentScore.title}</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {isDrawingMode ? '드로잉 모드' : '보기 모드'}
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <ScoreViewer
                  score={currentScore}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  viewport={viewport}
                  onViewportChange={updateViewport}
                  drawingEvents={drawingEvents}
                  isDrawingMode={isDrawingMode}
                  toolSettings={toolSettings}
                  onDrawingEvent={sendDrawingEvent}
                  userId={currentUser?.id || ''}
                />
                
                {/* 명령 오버레이 */}
                <CommandOverlay
                  commands={commands}
                  onCommandExpire={expireCommand}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};