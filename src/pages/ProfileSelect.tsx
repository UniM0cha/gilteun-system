import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, Wifi } from 'lucide-react';
import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Input } from '../components/ui';
import { useAppStore } from '../store/appStore';
import type { User } from '../types';

/**
 * 프로필 선택 페이지 (첫 화면)
 * - 사용자 이름 입력
 * - 서버 연결 설정
 * - 사용자 프로필 초기화
 */
export const ProfileSelectPage: React.FC = () => {
  const navigate = useNavigate();

  // 스토어 상태 및 액션
  const {
    settings,
    serverInfo,
    isLoading,
    setCurrentUser,
    updateSettings,
    setServerInfo,
    setLoading,
  } = useAppStore();

  // 폼 상태
  const [userName, setUserName] = useState(settings.userName || '');
  const [serverUrl, setServerUrl] = useState(settings.serverUrl || 'http://localhost:3001');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // 유효성 검사
  const [errors, setErrors] = useState<{
    userName?: string;
    serverUrl?: string;
  }>({});

  // 폼 초기값 설정
  useEffect(() => {
    if (settings.userName) setUserName(settings.userName);
    if (settings.serverUrl) setServerUrl(settings.serverUrl);
  }, [settings]);

  // 입력값 유효성 검사
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // 사용자 이름 검증
    if (!userName.trim()) {
      newErrors.userName = '사용자 이름을 입력해주세요';
    } else if (userName.trim().length < 2) {
      newErrors.userName = '사용자 이름은 2자 이상이어야 합니다';
    } else if (userName.trim().length > 20) {
      newErrors.userName = '사용자 이름은 20자 이하여야 합니다';
    }

    // 서버 URL 검증
    if (!serverUrl.trim()) {
      newErrors.serverUrl = '서버 주소를 입력해주세요';
    } else {
      try {
        new URL(serverUrl);
      } catch {
        newErrors.serverUrl = '올바른 서버 주소를 입력해주세요 (예: http://localhost:3001)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 서버 연결 테스트
  const testServerConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${serverUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // timeout은 fetch API에서 직접 지원하지 않음
      });

      if (response.ok) {
        const data = await response.json();
        setServerInfo({
          url: serverUrl,
          status: 'connected',
          connectedUsers: data.connectedUsers || 0,
          lastPing: Date.now(),
          version: data.version || '1.0.0',
        });
        return true;
      } else {
        throw new Error(`서버 응답 오류 (${response.status})`);
      }
    } catch (error) {
      console.error('서버 연결 실패:', error);
      setConnectionError(
        error instanceof Error
          ? `서버 연결에 실패했습니다: ${error.message}`
          : '서버에 연결할 수 없습니다. 서버 주소를 확인해주세요.',
      );
      return false;
    }
  };

  // 프로필 설정 완료
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    setLoading(true, '서버 연결 중...');

    try {
      // 서버 연결 테스트
      const isConnected = await testServerConnection();

      if (!isConnected) {
        return;
      }

      // 사용자 정보 업데이트
      const trimmedUserName = userName.trim();
      const user: User = {
        id: settings.userId || `user-${Date.now()}`,
        name: trimmedUserName,
        color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      // 설정 저장
      updateSettings({
        userName: trimmedUserName,
        serverUrl: serverUrl,
        autoConnect: true, // 성공적으로 연결되면 자동 연결 활성화
      });

      // 현재 사용자 설정
      setCurrentUser(user);

      // 예배 목록 페이지로 이동
      navigate('/worship');

    } catch (error) {
      console.error('프로필 설정 실패:', error);
      setConnectionError('프로필 설정 중 오류가 발생했습니다.');
    } finally {
      setIsConnecting(false);
      setLoading(false);
    }
  };

  // 서버 설정 페이지로 이동
  const handleAdvancedSettings = () => {
    navigate('/settings');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 헤더 */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">길튼 시스템</h1>
          <p className="text-gray-600">찬양팀 실시간 협업 플랫폼</p>
        </div>

        {/* 프로필 설정 카드 */}
        <Card shadow="md">
          <CardHeader>
            <CardTitle>사용자 정보 설정</CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* 사용자 이름 입력 */}
              <Input
                label="사용자 이름"
                placeholder="홍길동"
                data-testid="user-name-input"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                error={errors.userName}
                helper="찬양팀에서 사용할 이름을 입력하세요"
                maxLength={20}
                autoComplete="name"
                disabled={isConnecting || isLoading}
              />

              {/* 서버 주소 입력 */}
              <Input
                label="서버 주소"
                placeholder="http://localhost:3001"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                error={errors.serverUrl}
                helper="길튼 서버의 주소를 입력하세요"
                autoComplete="url"
                disabled={isConnecting || isLoading}
              />

              {/* 연결 에러 표시 */}
              {connectionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Wifi className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{connectionError}</p>
                  </div>
                </div>
              )}

              {/* 서버 연결 정보 (연결 성공 시) */}
              {serverInfo?.status === 'connected' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-green-700 font-medium">서버 연결 성공</p>
                      <p className="text-xs text-green-600">
                        현재 접속자: {serverInfo.connectedUsers}명
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="space-y-3">
              {/* 연결 및 시작 버튼 */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                data-testid="continue-button"
                loading={isConnecting || isLoading}
                disabled={!userName.trim() || !serverUrl.trim()}
              >
                {isConnecting || isLoading ? '연결 중...' : '시작하기'}
              </Button>

              {/* 고급 설정 버튼 */}
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="w-full"
                onClick={handleAdvancedSettings}
                disabled={isConnecting || isLoading}
              >
                <Settings className="w-4 h-4 mr-2" />
                고급 설정
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* 도움말 */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            길튼 서버가 실행 중인지 확인하고<br />
            올바른 서버 주소를 입력해주세요
          </p>
        </div>
      </div>
    </div>
  );
};
