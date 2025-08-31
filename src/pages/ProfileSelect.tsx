import { Music, Plus, Save, Wifi, X } from 'lucide-react';
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
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  const defaultServerUrl = 'http://localhost:3001';
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showNewProfileDialog, setShowNewProfileDialog] = useState(false);
  const [newProfileForm, setNewProfileForm] = useState({
    name: '',
    role: '인도자',
    icon: '👨‍🎤',
  });
  const [selectedIcon, setSelectedIcon] = useState('👨‍🎤');

  // 앱 시작 시 서버 연결 확인
  useEffect(() => {
    const abortController = new AbortController();

    const testConnection = async () => {
      // 이미 서버 정보가 있으면 스킵
      const currentServerInfo = useAppStore.getState().serverInfo;
      if (currentServerInfo?.status === 'connected') {
        return;
      }

      const { setLoading, setServerInfo, updateSettings } = useAppStore.getState();
      
      setLoading(true, '서버 연결 중...');
      try {
        const response = await fetch(`${defaultServerUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
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
        // AbortError는 무시 (컴포넌트 언마운트 시)
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        
        console.error('서버 연결 실패:', error);
        setConnectionError(
          error instanceof Error ? `서버 연결에 실패했습니다: ${error.message}` : '서버에 연결할 수 없습니다.',
        );
        setServerInfo(null);
      } finally {
        // abort되지 않았을 때만 로딩 상태 해제
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    testConnection();

    return () => {
      abortController.abort();
    };
  }, []); // 최초 마운트 시 한 번만 실행

  const profiles = [
    { id: 'leader', name: '김찬양', role: '인도자', icon: '👨‍🎤', color: 'bg-blue-500', colorHex: '#3b82f6' },
    { id: 'piano', name: '이피아노', role: '반주자', icon: '🎹', color: 'bg-green-500', colorHex: '#22c55e' },
    { id: 'guitar', name: '박기타', role: '기타리스트', icon: '🎸', color: 'bg-purple-500', colorHex: '#a855f7' },
    { id: 'drum', name: '최드럼', role: '드러머', icon: '🥁', color: 'bg-orange-500', colorHex: '#f97316' },
  ];

  const availableIcons = ['👨‍🎤', '👩‍🎤', '🎹', '🎸', '🥁', '🎤', '🎵', '🎶', '🎼', '🎺', '🎻', '🎷'];

  const handleProfileSelect = (profile: (typeof profiles)[number]) => {
    const user: User = {
      id: profile.id,
      name: profile.name,
      color: profile.colorHex,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    setCurrentUser(user);
    useAppStore.getState().updateSettings({ userName: profile.name });
    navigate('/worship');
  };

  const handleCreateProfile = () => {
    if (!newProfileForm.name.trim()) return;

    const user: User = {
      id: `custom-${Date.now()}`,
      name: newProfileForm.name,
      color: '#3b82f6', // Default blue color
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    setCurrentUser(user);
    useAppStore.getState().updateSettings({ userName: newProfileForm.name });
    setShowNewProfileDialog(false);
    navigate('/worship');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" data-testid="profile-select">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
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

        {/* Profile Selection */}
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
                  className={`${profile.color} mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl`}
                >
                  {profile.icon}
                </div>
                <h3 className="text-center text-lg font-semibold text-slate-800">{profile.name}</h3>
                <p className="mt-1 text-center text-sm text-slate-600">{profile.role}</p>
              </div>
            ))}

            {/* New Profile Card */}
            <div
              onClick={() => setShowNewProfileDialog(true)}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 shadow-lg transition-all duration-200 hover:border-blue-400 hover:shadow-xl"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200">
                <Plus className="h-8 w-8 text-slate-600" />
              </div>
              <h3 className="text-center text-lg font-semibold text-slate-600">새 프로필</h3>
            </div>
          </div>
        </div>

        {/* New Profile Dialog */}
        {showNewProfileDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-800">새 프로필 생성</h3>
                <button
                  onClick={() => setShowNewProfileDialog(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">이름</label>
                  <input
                    type="text"
                    placeholder="이름을 입력하세요"
                    value={newProfileForm.name}
                    onChange={(e) => setNewProfileForm({ ...newProfileForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">역할</label>
                  <select 
                    value={newProfileForm.role}
                    onChange={(e) => setNewProfileForm({ ...newProfileForm, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800"
                  >
                    <option>인도자</option>
                    <option>반주자</option>
                    <option>기타리스트</option>
                    <option>드러머</option>
                    <option>베이시스트</option>
                    <option>보컬</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    아이콘 선택
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {availableIcons.map((icon, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedIcon(icon);
                          setNewProfileForm({ ...newProfileForm, icon });
                        }}
                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-colors ${
                          selectedIcon === icon
                            ? 'bg-blue-100 ring-2 ring-blue-500'
                            : 'bg-slate-100 hover:bg-blue-100'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewProfileDialog(false)}
                    className="flex-1 rounded-xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    취소
                  </button>
                  <button 
                    onClick={handleCreateProfile}
                    className="flex-1 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700"
                  >
                    <Save className="mr-2 inline-block h-4 w-4" />
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
