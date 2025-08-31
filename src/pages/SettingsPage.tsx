import { ArrowLeft, Moon, Save, Sun, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

interface ProfileSettings {
  name: string;
  role: string;
  icon: string;
}

interface AppSettings {
  darkMode: boolean;
  applePencilPressure: boolean;
  palmRejection: boolean;
  autoConnect: boolean;
  autoSave: boolean;
  annotationThickness: number;
}

/**
 * 설정 페이지
 * - 프로필 설정
 * - 테마 설정 (다크모드)
 * - 입력 설정 (Apple Pencil)
 * - 위험 구역 (프로필 삭제)
 */
export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, settings, updateSettings, setCurrentUser } = useAppStore();

  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    name: currentUser?.name || '',
    role: '인도자',
    icon: '👨‍🎤',
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    darkMode: false,
    applePencilPressure: true,
    palmRejection: true,
    autoConnect: settings?.autoConnect || true,
    autoSave: true,
    annotationThickness: 3,
  });

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const roles = ['인도자', '반주자', '기타리스트', '드러머', '베이시스트', '보컬'];
  const icons = ['👨‍🎤', '👩‍🎤', '🎹', '🎸', '🥁', '🎤', '🎵', '🎶', '🎼', '🎺', '🎻', '🎷'];

  // 다크모드 토글
  useEffect(() => {
    if (appSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('gilteun-dark-mode', String(appSettings.darkMode));
  }, [appSettings.darkMode]);

  // 초기 설정 로드
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('gilteun-dark-mode') === 'true';
    const savedPencilPressure = localStorage.getItem('gilteun-pencil-pressure') !== 'false';
    const savedPalmRejection = localStorage.getItem('gilteun-palm-rejection') !== 'false';
    const savedAutoSave = localStorage.getItem('gilteun-auto-save') !== 'false';
    const savedThickness = localStorage.getItem('gilteun-annotation-thickness');

    setAppSettings((prev) => ({
      ...prev,
      darkMode: savedDarkMode,
      applePencilPressure: savedPencilPressure,
      palmRejection: savedPalmRejection,
      autoSave: savedAutoSave,
      annotationThickness: savedThickness ? parseInt(savedThickness) : 3,
    }));
  }, []);

  // 프로필 설정 저장
  const handleSaveProfile = () => {
    if (!profileSettings.name.trim()) {
      alert('이름을 입력하세요.');
      return;
    }

    // 사용자 정보 업데이트
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        name: profileSettings.name,
      };
      setCurrentUser(updatedUser);
      updateSettings({ userName: profileSettings.name });
    }

    // 로컬 스토리지에 저장
    localStorage.setItem('gilteun-profile', JSON.stringify(profileSettings));

    alert('프로필이 저장되었습니다.');
    setHasChanges(false);
  };

  // 앱 설정 저장
  const handleSaveAppSettings = () => {
    // 로컬 스토리지에 저장
    localStorage.setItem('gilteun-pencil-pressure', String(appSettings.applePencilPressure));
    localStorage.setItem('gilteun-palm-rejection', String(appSettings.palmRejection));
    localStorage.setItem('gilteun-auto-save', String(appSettings.autoSave));
    localStorage.setItem('gilteun-annotation-thickness', String(appSettings.annotationThickness));

    // 스토어 업데이트
    updateSettings({
      autoConnect: appSettings.autoConnect,
    });

    alert('설정이 저장되었습니다.');
    setHasChanges(false);
  };

  // 프로필 삭제
  const handleDeleteProfile = () => {
    // 로컬 스토리지 클리어
    localStorage.removeItem('gilteun-profile');
    localStorage.removeItem('gilteun-commands');
    localStorage.removeItem('gilteun-command-history');
    
    // 스토어 초기화
    setCurrentUser(null);
    updateSettings({ userName: '' });
    
    // 프로필 선택 페이지로 이동
    navigate('/');
  };

  // 권한 체크
  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center space-x-4">
          <button
            onClick={() => navigate('/worship')}
            className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">설정</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <h2 className="mb-4 text-xl font-semibold text-slate-800 dark:text-slate-100">프로필 설정</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500 text-2xl">
                  {profileSettings.icon}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="닉네임"
                    value={profileSettings.name}
                    onChange={(e) => {
                      setProfileSettings({ ...profileSettings, name: e.target.value });
                      setHasChanges(true);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">역할</label>
                <select
                  value={profileSettings.role}
                  onChange={(e) => {
                    setProfileSettings({ ...profileSettings, role: e.target.value });
                    setHasChanges(true);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">아이콘</label>
                <div className="grid grid-cols-6 gap-3">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => {
                        setProfileSettings({ ...profileSettings, icon });
                        setHasChanges(true);
                      }}
                      className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-colors ${
                        profileSettings.icon === icon
                          ? 'bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-900/50'
                          : 'bg-slate-100 hover:bg-blue-50 dark:bg-slate-700 dark:hover:bg-blue-900/30'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={!hasChanges}
                  className={`w-full rounded-xl px-6 py-3 font-semibold shadow-lg ${
                    hasChanges
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="mr-2 inline-block h-4 w-4" />
                  프로필 저장
                </button>
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <h2 className="mb-4 text-xl font-semibold text-slate-800 dark:text-slate-100">테마 설정</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">다크 모드</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">어두운 테마로 전환</p>
              </div>
              <button
                onClick={() => setAppSettings({ ...appSettings, darkMode: !appSettings.darkMode })}
                className={`relative h-7 w-14 rounded-full transition-colors ${
                  appSettings.darkMode ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                    appSettings.darkMode ? 'translate-x-7' : 'translate-x-0.5'
                  }`}
                >
                  {appSettings.darkMode ? (
                    <Moon className="h-6 w-6 p-1 text-blue-600" />
                  ) : (
                    <Sun className="h-6 w-6 p-1 text-yellow-500" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Input Settings */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <h2 className="mb-4 text-xl font-semibold text-slate-800 dark:text-slate-100">입력 설정</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">Apple Pencil 압력 감지</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">필압에 따라 선 굵기 조절</p>
                </div>
                <button
                  onClick={() => {
                    setAppSettings({ ...appSettings, applePencilPressure: !appSettings.applePencilPressure });
                    setHasChanges(true);
                  }}
                  className={`relative h-7 w-14 rounded-full transition-colors ${
                    appSettings.applePencilPressure ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                      appSettings.applePencilPressure ? 'translate-x-7' : 'translate-x-0.5'
                    }`}
                  ></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">손바닥 거치 방지</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">손바닥 터치 무시</p>
                </div>
                <button
                  onClick={() => {
                    setAppSettings({ ...appSettings, palmRejection: !appSettings.palmRejection });
                    setHasChanges(true);
                  }}
                  className={`relative h-7 w-14 rounded-full transition-colors ${
                    appSettings.palmRejection ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                      appSettings.palmRejection ? 'translate-x-7' : 'translate-x-0.5'
                    }`}
                  ></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">자동 저장</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">주석 자동 저장</p>
                </div>
                <button
                  onClick={() => {
                    setAppSettings({ ...appSettings, autoSave: !appSettings.autoSave });
                    setHasChanges(true);
                  }}
                  className={`relative h-7 w-14 rounded-full transition-colors ${
                    appSettings.autoSave ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                      appSettings.autoSave ? 'translate-x-7' : 'translate-x-0.5'
                    }`}
                  ></div>
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  기본 펜 굵기: {appSettings.annotationThickness}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={appSettings.annotationThickness}
                  onChange={(e) => {
                    setAppSettings({ ...appSettings, annotationThickness: parseInt(e.target.value) });
                    setHasChanges(true);
                  }}
                  className="w-full"
                />
              </div>

              {hasChanges && (
                <button
                  onClick={handleSaveAppSettings}
                  className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700"
                >
                  <Save className="mr-2 inline-block h-4 w-4" />
                  설정 저장
                </button>
              )}
            </div>
          </div>

          {/* Connection Settings */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <h2 className="mb-4 text-xl font-semibold text-slate-800 dark:text-slate-100">연결 설정</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">자동 연결</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">앱 시작 시 서버에 자동 연결</p>
              </div>
              <button
                onClick={() => {
                  setAppSettings({ ...appSettings, autoConnect: !appSettings.autoConnect });
                  updateSettings({ autoConnect: !appSettings.autoConnect });
                }}
                className={`relative h-7 w-14 rounded-full transition-colors ${
                  appSettings.autoConnect ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                    appSettings.autoConnect ? 'translate-x-7' : 'translate-x-0.5'
                  }`}
                ></div>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <h2 className="mb-4 text-xl font-semibold text-red-800 dark:text-red-400">위험 구역</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium text-red-800 dark:text-red-400">프로필 완전 삭제</h3>
                <p className="mb-4 text-sm text-red-700 dark:text-red-300">
                  이 작업은 되돌릴 수 없습니다. 프로필과 관련된 모든 데이터가 영구적으로 삭제됩니다.
                </p>
                <button
                  onClick={() => setShowDeleteConfirmDialog(true)}
                  className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white shadow-lg hover:bg-red-700"
                >
                  <Trash2 className="mr-2 inline-block h-4 w-4" />
                  프로필 영구 삭제
                </button>
              </div>
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirmDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
                <div className="mb-6 flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">프로필 완전 삭제</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">이 작업은 되돌릴 수 없습니다</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <p className="mb-2 text-sm font-medium text-red-800 dark:text-red-300">삭제될 데이터:</p>
                    <ul className="space-y-1 text-sm text-red-700 dark:text-red-400">
                      <li>• 프로필 정보 ({currentUser?.name})</li>
                      <li>• 개인 설정 및 환경설정</li>
                      <li>• 드로잉 및 마크업 데이터</li>
                      <li>• 활동 기록 및 히스토리</li>
                    </ul>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    정말로 <strong className="text-slate-800 dark:text-slate-200">{currentUser?.name}</strong>{' '}
                    프로필을 영구적으로 삭제하시겠습니까?
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirmDialog(false)}
                    className="flex-1 rounded-xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirmDialog(false);
                      handleDeleteProfile();
                    }}
                    className="flex-1 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-red-700"
                  >
                    <Trash2 className="mr-2 inline-block h-4 w-4" />
                    영구 삭제
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};