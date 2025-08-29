import { Music, Wifi } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import type { User } from '../types';

/**
 * 프로필 선택 페이지
 * - 서버는 동일 컴퓨터에서 실행되므로 기본 주소로 자동 연결
 * - 프로필을 선택하면 예배 목록 페이지로 이동
 */
export const ProfileSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentUser, updateSettings, setServerInfo, setLoading } = useAppStore();

  const defaultServerUrl = 'http://localhost:3001';
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // 앱 시작 시 서버 연결 확인
  useEffect(() => {
    const testConnection = async () => {
      setLoading(true, '서버 연결 중...');
      try {
        const response = await fetch(`${defaultServerUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          setServerInfo({
            url: defaultServerUrl,
            status: 'connected',
            connectedUsers: data.connectedUsers || 0,
            lastPing: Date.now(),
            version: data.version || '1.0.0',
          });
          updateSettings({ serverUrl: defaultServerUrl, autoConnect: true });
          setConnectionError(null);
        } else {
          throw new Error(`서버 응답 오류 (${response.status})`);
        }
      } catch (error) {
        console.error('서버 연결 실패:', error);
        setConnectionError(
          error instanceof Error ? `서버 연결에 실패했습니다: ${error.message}` : '서버에 연결할 수 없습니다.',
        );
        setServerInfo(null);
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, [defaultServerUrl, setServerInfo, setLoading, updateSettings]);

  const profiles = [
    { id: 'leader', name: '김찬양', role: '인도자', icon: '👨‍🎤', color: '#3b82f6' },
    { id: 'piano', name: '이피아노', role: '반주자', icon: '🎹', color: '#22c55e' },
    { id: 'guitar', name: '박기타', role: '기타리스트', icon: '🎸', color: '#a855f7' },
    { id: 'drum', name: '최드럼', role: '드러머', icon: '🥁', color: '#f97316' },
  ];

  const handleProfileSelect = (profile: (typeof profiles)[number]) => {
    const user: User = {
      id: profile.id,
      name: profile.name,
      color: profile.color,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    setCurrentUser(user);
    updateSettings({ userName: profile.name });
    navigate('/worship');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" data-testid="profile-select">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Music className="h-12 w-12 text-white" />
          </div>
          <h1 className="mb-3 text-4xl font-bold text-slate-800">길튼 시스템</h1>
          <p className="text-lg text-slate-600">교회 찬양팀 예배 지원 시스템</p>
        </div>

        {connectionError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <Wifi className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{connectionError}</p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="mb-6 text-2xl font-semibold text-slate-700">프로필 선택</h2>
          <div className="mb-6 grid grid-cols-2 gap-6 lg:grid-cols-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => handleProfileSelect(profile)}
                className="cursor-pointer rounded-2xl border-2 border-transparent bg-white p-6 shadow-lg transition-all duration-200 hover:border-blue-300 hover:shadow-xl"
              >
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: profile.color }}
                >
                  {profile.icon}
                </div>
                <h3 className="text-center text-lg font-semibold text-slate-800">{profile.name}</h3>
                <p className="mt-1 text-center text-sm text-slate-600">{profile.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
