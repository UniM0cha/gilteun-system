import { useEffect } from 'react';
import { Button } from '../components/ui/button';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { useProfile } from '../hooks/useProfile';
import { useSocket, useCommandReceived } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';

export const Worship = () => {
  const { currentUser, getCurrentInstrument } = useProfile();
  const { connect, socketService } = useSocket();
  const navigate = useNavigate();
  const currentInstrument = getCurrentInstrument();

  // 명령 수신 처리
  useCommandReceived((command) => {
    console.log('명령 수신:', command);
    // TODO: Phase 4에서 명령 오버레이 표시 구현
  });

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">예배 화면</h2>
          <p className="text-gray-600">
            Phase 3에서 악보 뷰어와 드로잉 기능이 구현됩니다.
          </p>
          <div className="bg-white p-8 rounded-lg shadow-sm border-2 border-dashed border-gray-300">
            <p className="text-gray-500">악보 영역 (개발 예정)</p>
          </div>

          {/* 테스트용 명령 전송 버튼 (인도자/관리자만) */}
          {(currentUser.role === 'leader' || currentUser.role === 'admin') && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">명령 전송 (테스트)</h3>
              <div className="space-x-2">
                <Button
                  onClick={() => {
                    if (socketService.connected) {
                      socketService.sendCommand({
                        content: '1절로 이동',
                        senderId: currentUser.id,
                        senderName: currentUser.name,
                        senderInstrument: currentInstrument?.name || '',
                        target: 'all',
                      });
                    }
                  }}
                  variant="outline"
                >
                  1절로 이동
                </Button>
                <Button
                  onClick={() => {
                    if (socketService.connected) {
                      socketService.sendCommand({
                        content: '처음부터 다시',
                        senderId: currentUser.id,
                        senderName: currentUser.name,
                        senderInstrument: currentInstrument?.name || '',
                        target: 'all',
                      });
                    }
                  }}
                  variant="outline"
                >
                  처음부터 다시
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};