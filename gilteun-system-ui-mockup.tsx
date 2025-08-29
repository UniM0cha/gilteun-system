import React, { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Crown,
  Database,
  Download,
  Edit,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Grid3X3,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Music,
  Play,
  Plus,
  Redo2,
  Save,
  Send,
  Settings,
  StickyNote,
  Trash2,
  Undo2,
  Upload,
  User,
  X,
} from 'lucide-react';

const GilteunSystemUiMockup = () => {
  const [currentPage, setCurrentPage] = useState('profile-select');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showNewProfileDialog, setShowNewProfileDialog] = useState(false);
  const [showNewWorshipDialog, setShowNewWorshipDialog] = useState(false);
  const [showNewCommandDialog, setShowNewCommandDialog] = useState(false);
  const [showCommandSendModal, setShowCommandSendModal] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [showSongEditDialog, setShowSongEditDialog] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState('members');
  const [selectedDate, setSelectedDate] = useState('2024-03-15');
  const [songOrder, setSongOrder] = useState([1, 2, 3, 4]);
  const [penThickness, setPenThickness] = useState(3); // New state for pen thickness
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  const profiles = [
    { id: 1, name: '김찬양', role: '인도자', icon: '👨‍🎤', color: 'bg-blue-500' },
    {
      id: 2,
      name: '이피아노',
      role: '반주자',
      icon: '🎹',
      color: 'bg-green-500',
    },
    {
      id: 3,
      name: '박기타',
      role: '기타리스트',
      icon: '🎸',
      color: 'bg-purple-500',
    },
    {
      id: 4,
      name: '최드럼',
      role: '드러머',
      icon: '🥁',
      color: 'bg-orange-500',
    },
  ];

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
    setIsLoggedIn(true);
    setCurrentPage('worship-list');
  };

  const handleLogout = () => {
    setSelectedProfile(null);
    setIsLoggedIn(false);
    setCurrentPage('profile-select');
  };

  const PageContent = () => {
    if (!isLoggedIn) {
      return <ProfileSelectPage />;
    }

    switch (currentPage) {
      case 'worship-list':
        return <WorshipListPage />;
      case 'song-list':
        return <SongListPage />;
      case 'score-viewer':
        return <ScoreViewerPage />;
      case 'command-editor':
        return <CommandEditorPage />;
      case 'admin':
        return <AdminPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <WorshipListPage />;
    }
  };

  const ProfileSelectPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Music className="h-12 w-12 text-white" />
          </div>
          <h1 className="mb-3 text-4xl font-bold text-slate-800 dark:text-slate-100">길튼 시스템</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">교회 찬양팀 예배 지원 시스템</p>
        </div>

        {/* Profile Selection */}
        <div className="mb-8">
          <h2 className="mb-6 text-2xl font-semibold text-slate-700 dark:text-slate-200">프로필 선택</h2>
          <div className="mb-6 grid grid-cols-2 gap-6 lg:grid-cols-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => handleProfileSelect(profile)}
                className="cursor-pointer rounded-2xl border-2 border-transparent bg-white p-6 shadow-lg transition-all duration-200 hover:border-blue-300 hover:shadow-xl dark:bg-slate-800"
              >
                <div
                  className={`h-16 w-16 ${profile.color} mx-auto mb-4 flex items-center justify-center rounded-2xl text-2xl`}
                >
                  {profile.icon}
                </div>
                <h3 className="text-center text-lg font-semibold text-slate-800 dark:text-slate-100">{profile.name}</h3>
                <p className="mt-1 text-center text-sm text-slate-600 dark:text-slate-400">{profile.role}</p>
              </div>
            ))}

            {/* New Profile Card */}
            <div
              onClick={() => setShowNewProfileDialog(true)}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 shadow-lg transition-all duration-200 hover:border-blue-400 hover:shadow-xl dark:border-slate-600 dark:bg-slate-800"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-700">
                <Plus className="h-8 w-8 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-center text-lg font-semibold text-slate-600 dark:text-slate-400">새 프로필</h3>
            </div>
          </div>
        </div>

        {/* New Profile Dialog */}
        {showNewProfileDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">새 프로필 생성</h3>
                <button
                  onClick={() => setShowNewProfileDialog(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">이름</label>
                  <input
                    type="text"
                    placeholder="이름을 입력하세요"
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">역할</label>
                  <select className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    <option>인도자</option>
                    <option>반주자</option>
                    <option>기타리스트</option>
                    <option>드러머</option>
                    <option>베이시스트</option>
                    <option>보컬</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    아이콘 선택
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {['👨‍🎤', '👩‍🎤', '🎹', '🎸', '🥁', '🎤', '🎵', '🎶', '🎼', '🎺', '🎻', '🎷'].map((icon, idx) => (
                      <button
                        key={idx}
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-blue-900/50"
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewProfileDialog(false)}
                    className="flex-1 rounded-xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    취소
                  </button>
                  <button className="flex-1 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700">
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

  const WorshipListPage = () => (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <User className="h-5 w-5" />
              <span>{selectedProfile?.name}</span>
            </button>
            <span className="text-slate-400">|</span>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">예배 목록</h1>
          </div>
          <button
            onClick={() => setShowNewWorshipDialog(true)}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700"
          >
            <Plus className="mr-2 inline-block h-5 w-5" />새 예배 생성
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Calendar Section */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <h2 className="mb-4 text-xl font-semibold text-slate-800 dark:text-slate-100">날짜 선택</h2>

            {/* Calendar Header */}
            <div className="mb-6 flex items-center justify-between">
              <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700">
                <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">2024년 3월</h3>
              <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700">
                <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="mb-4 grid grid-cols-7 gap-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div key={idx} className="p-3 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {Array.from({ length: 35 }, (_, idx) => {
                const dayNumber = idx - 5; // Assuming March 1st is on Friday (index 5)
                const isCurrentMonth = dayNumber > 0 && dayNumber <= 31;
                const isSelected = dayNumber === 15; // Selected date
                const hasWorship = [8, 10, 15, 17, 22, 24, 29, 31].includes(dayNumber); // Days with worship

                return (
                  <button
                    key={idx}
                    onClick={() =>
                      isCurrentMonth && setSelectedDate(`2024-03-${dayNumber.toString().padStart(2, '0')}`)
                    }
                    className={`relative rounded-lg p-3 text-sm transition-colors ${
                      !isCurrentMonth
                        ? 'text-slate-300 dark:text-slate-600'
                        : isSelected
                          ? 'bg-blue-600 font-semibold text-white'
                          : hasWorship
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
                            : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isCurrentMonth ? dayNumber : ''}
                    {hasWorship && !isSelected && (
                      <div className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-600"></div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-center text-sm text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                <span>예배 있는 날</span>
              </span>
            </div>
          </div>

          {/* Selected Date Worship List */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">3월 15일 예배</h2>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                금요일
              </span>
            </div>

            <div className="space-y-4">
              {[
                {
                  id: 1,
                  title: '금요 기도회',
                  time: '19:30',
                  status: '예정',
                  participants: 8,
                },
                {
                  id: 2,
                  title: '청년 기도회',
                  time: '21:00',
                  status: '예정',
                  participants: 12,
                },
              ].map((worship) => (
                <div
                  key={worship.id}
                  className="cursor-pointer rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-md dark:border-slate-700"
                  onClick={() => setCurrentPage('song-list')}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{worship.title}</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        <Clock className="mr-1 inline-block h-4 w-4" />
                        {worship.time}
                      </p>
                    </div>
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      {worship.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600 dark:text-slate-400">참석자 {worship.participants}명</div>
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                      진행하기
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State when no worship on selected date */}
            <div className="py-8 text-center text-slate-500">
              <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="mb-4">선택한 날짜에 예배가 없습니다</p>
              <button
                onClick={() => setShowNewWorshipDialog(true)}
                className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                새 예배를 생성하시겠습니까?
              </button>
            </div>
          </div>
        </div>

        {/* New Worship Dialog - Enhanced */}
        {showNewWorshipDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">새 예배 생성</h3>
                <button
                  onClick={() => setShowNewWorshipDialog(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">예배 유형</label>
                  <select className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    <option>주일 1부 예배</option>
                    <option>주일 2부 예배</option>
                    <option>주일 3부 예배</option>
                    <option>수요 예배</option>
                    <option>금요 기도회</option>
                    <option>청년 예배</option>
                    <option>새벽 기도회</option>
                    <option>직접 입력</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    사용자 정의 예배명
                  </label>
                  <input
                    type="text"
                    placeholder="예배명을 직접 입력하세요 (선택사항)"
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">날짜</label>
                    <input
                      type="date"
                      value={selectedDate}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">시간</label>
                    <input
                      type="time"
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    설명 (선택)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="예배에 대한 간단한 설명을 작성하세요"
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewWorshipDialog(false)}
                    className="flex-1 rounded-xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    취소
                  </button>
                  <button className="flex-1 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700">
                    <Save className="mr-2 inline-block h-4 w-4" />
                    생성
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const SongListPage = () => {
    const songs = [
      {
        id: 1,
        title: '주 은혜임을',
        key: 'G',
        memo: '2절 후 간주 길게',
        hasScore: true,
        image: 'score1.jpg',
      },
      {
        id: 2,
        title: '살아계신 주',
        key: 'C',
        memo: '템포 조금 느리게',
        hasScore: true,
        image: 'score2.jpg',
      },
      {
        id: 3,
        title: '나의 반석이신 하나님',
        key: 'F',
        memo: '',
        hasScore: true,
        image: 'score3.jpg',
      },
      {
        id: 4,
        title: '십자가 그 사랑',
        key: 'D',
        memo: '마지막 코러스 반복',
        hasScore: true,
        image: 'score4.jpg',
      },
    ];

    const reorderedSongs = songOrder.map((index) => songs[index - 1]);

    const handleEditSong = (song) => {
      setEditingSong(song);
      setShowSongEditDialog(true);
    };

    const sendQuickCommand = (command) => {
      // Quick command send without dialog
      console.log(`Quick command sent: ${command}`);
      // Show brief confirmation
    };

    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('worship-list')}
                className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">찬양 목록</h1>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                금요 기도회
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBulkUploadDialog(true)}
                className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-green-700"
              >
                <Upload className="mr-2 inline-block h-5 w-5" />
                악보 일괄 업로드
              </button>
            </div>
          </div>

          {/* Song Order List */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">찬양 순서</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400">드래그하여 순서 변경</div>
            </div>

            <div className="space-y-3">
              {reorderedSongs.map((song, index) => (
                <div
                  key={`${song.id}-${index}`}
                  className="group dark:bg-slate-750 cursor-move rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md dark:border-slate-700"
                >
                  <div className="flex items-center space-x-4">
                    {/* Drag Handle */}
                    <div className="flex items-center space-x-3">
                      <div className="text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-400">
                        <Grid3X3 className="h-5 w-5" />
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        {index + 1}
                      </div>
                    </div>

                    {/* Score Preview */}
                    <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-600">
                      <FileText className="h-6 w-6 text-slate-500" />
                    </div>

                    {/* Song Info */}
                    <div className="flex-1">
                      <div className="mb-2 flex items-center space-x-3">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{song.title}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {song.key}
                        </span>
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          악보 있음
                        </span>
                      </div>

                      {/* Memo Display Only */}
                      <div className="text-sm text-slate-600 dark:text-slate-400">{song.memo || '메모 없음'}</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditSong(song)}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="편집"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-red-500 hover:text-red-700" title="삭제">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Start Worship Button */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setCurrentPage('score-viewer')}
                className="transform rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
              >
                <Play className="mr-3 inline-block h-6 w-6" />
                예배 시작하기
              </button>
            </div>
          </div>

          {/* Song Edit Dialog */}
          {showSongEditDialog && editingSong && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">찬양 편집</h3>
                  <button
                    onClick={() => setShowSongEditDialog(false)}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      찬양 제목
                    </label>
                    <input
                      type="text"
                      defaultValue={editingSong.title}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      키 (Key)
                    </label>
                    <select
                      defaultValue={editingSong.key}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      <option value="C">C</option>
                      <option value="C#">C#</option>
                      <option value="D">D</option>
                      <option value="D#">D#</option>
                      <option value="E">E</option>
                      <option value="F">F</option>
                      <option value="F#">F#</option>
                      <option value="G">G</option>
                      <option value="G#">G#</option>
                      <option value="A">A</option>
                      <option value="A#">A#</option>
                      <option value="B">B</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">메모</label>
                    <textarea
                      rows={3}
                      defaultValue={editingSong.memo}
                      placeholder="찬양에 대한 메모를 입력하세요..."
                      className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowSongEditDialog(false)}
                      className="flex-1 rounded-xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => setShowSongEditDialog(false)}
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

          {/* Bulk Upload Dialog */}
          {showBulkUploadDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">악보 일괄 업로드</h3>
                  <button
                    onClick={() => setShowBulkUploadDialog(false)}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
                  악보 이미지 1개 = 찬양 1개로 업로드됩니다
                </p>

                {/* Upload Zone */}
                <div className="mb-6 cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-blue-400 dark:border-slate-600 dark:hover:border-blue-500">
                  <Upload className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                  <p className="mb-2 text-lg font-medium text-slate-600 dark:text-slate-400">악보를 드래그하거나</p>
                  <p className="text-sm text-slate-500">클릭하여 여러 장 선택</p>
                </div>

                {/* Uploaded Files with Edit Options */}
                <div className="mb-6 space-y-4">
                  {[
                    {
                      id: 1,
                      filename: 'score1.jpg',
                      tempTitle: '찬양 1',
                      key: 'C',
                      memo: '',
                      size: '1.2MB',
                    },
                    {
                      id: 2,
                      filename: 'score2.jpg',
                      tempTitle: '찬양 2',
                      key: 'G',
                      memo: '',
                      size: '980KB',
                    },
                    {
                      id: 3,
                      filename: 'score3.jpg',
                      tempTitle: '찬양 3',
                      key: 'D',
                      memo: '',
                      size: '1.5MB',
                    },
                  ].map((file) => (
                    <div
                      key={file.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700"
                    >
                      {/* File Info Header */}
                      <div className="mb-4 flex items-center space-x-3">
                        <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-600">
                          <FileText className="h-6 w-6 text-slate-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 truncate font-mono text-sm text-slate-500 dark:text-slate-400">
                            {file.filename}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{file.size}</p>
                        </div>
                        <button className="p-1 text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Editable Song Info */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                            찬양 제목
                          </label>
                          <input
                            type="text"
                            defaultValue={file.tempTitle}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-600 dark:text-slate-200"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                            코드 (Key)
                          </label>
                          <select
                            defaultValue={file.key}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-600 dark:text-slate-200"
                          >
                            <option value="C">C</option>
                            <option value="C#">C#</option>
                            <option value="D">D</option>
                            <option value="D#">D#</option>
                            <option value="E">E</option>
                            <option value="F">F</option>
                            <option value="F#">F#</option>
                            <option value="G">G</option>
                            <option value="G#">G#</option>
                            <option value="A">A</option>
                            <option value="A#">A#</option>
                            <option value="B">B</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                            메모 (선택)
                          </label>
                          <input
                            type="text"
                            defaultValue={file.memo}
                            placeholder="찬양에 대한 메모..."
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-600 dark:text-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowBulkUploadDialog(false)}
                    className="flex-1 rounded-xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setShowBulkUploadDialog(false)}
                    className="flex-1 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-green-700"
                  >
                    <Save className="mr-2 inline-block h-4 w-4" />
                    찬양 목록에 추가
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ScoreViewerPage = () => {
    const worshipSongs = [
      {
        id: 1,
        title: '주 은혜임을',
        key: 'G',
        memo: '2절 후 간주 길게',
        image: 'score1.jpg',
      },
      {
        id: 2,
        title: '살아계신 주',
        key: 'C',
        memo: '템포 조금 느리게',
        image: 'score2.jpg',
      },
      {
        id: 3,
        title: '나의 반석이신 하나님',
        key: 'F',
        memo: '',
        image: 'score3.jpg',
      },
      {
        id: 4,
        title: '십자가 그 사랑',
        key: 'D',
        memo: '마지막 코러스 반복',
        image: 'score4.jpg',
      },
    ];

    const currentSong = worshipSongs[currentSongIndex];

    const sendQuickCommand = (commandText) => {
      console.log(`Quick command sent: ${commandText}`);
      // Show brief toast notification
    };

    const sendCommand = (commandText) => {
      console.log(`Command sent: ${commandText}`);
      setShowCommandSendModal(false);
      // Show confirmation toast
    };

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      setTouchStart(touch.clientX);
    };

    const handleTouchEnd = (e) => {
      if (!touchStart) return;

      const touch = e.changedTouches[0];
      const touchEnd = touch.clientX;
      const diff = touchStart - touchEnd;

      // Minimum swipe distance
      if (Math.abs(diff) > 50) {
        if (diff > 0 && currentSongIndex < worshipSongs.length - 1) {
          // Swipe left - next song
          setCurrentSongIndex(currentSongIndex + 1);
        } else if (diff < 0 && currentSongIndex > 0) {
          // Swipe right - previous song
          setCurrentSongIndex(currentSongIndex - 1);
        }
      }
    };

    const [touchStart, setTouchStart] = useState(null);

    return (
      <div
        className={`flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
      >
        {/* Top Toolbar - Hide in fullscreen */}
        {!isFullscreen && (
          <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentPage('song-list')}
                  className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{currentSong.title}</h2>
                <span className="text-slate-500">
                  찬양 {currentSongIndex + 1}/{worshipSongs.length}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  Key: {currentSong.key}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                {/* View/Draw Mode Toggle */}
                <div className="flex items-center space-x-2 rounded-xl bg-slate-100 p-2 dark:bg-slate-700">
                  <button
                    onClick={() => setDrawingMode(false)}
                    className={`rounded-lg p-2 transition-colors ${!drawingMode ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-600'}`}
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setDrawingMode(true)}
                    className={`rounded-lg p-2 transition-colors ${drawingMode ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-600'}`}
                  >
                    <Edit3 className="h-5 w-5" />
                  </button>
                </div>

                {/* Drawing Tools - Show only in drawing mode */}
                {drawingMode && (
                  <>
                    <div className="flex space-x-1 rounded-xl bg-slate-100 p-2 dark:bg-slate-700">
                      {['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'].map(
                        (color, idx) => (
                          <button
                            key={idx}
                            className={`h-8 w-8 ${color} rounded-lg transition-transform hover:scale-110 ${idx === 1 ? 'ring-2 ring-slate-800 dark:ring-slate-200' : ''}`}
                          />
                        ),
                      )}
                    </div>

                    {/* Pen Thickness Slider */}
                    <div className="flex items-center space-x-2 rounded-xl bg-slate-100 p-3 dark:bg-slate-700">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">굵기</span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={penThickness}
                        onChange={(e) => setPenThickness(e.target.value)}
                        className="h-1 w-16 cursor-pointer appearance-none rounded-lg bg-slate-300 dark:bg-slate-600"
                      />
                      <span className="w-4 font-mono text-xs text-slate-600 dark:text-slate-400">{penThickness}</span>
                    </div>

                    <div className="flex space-x-1 rounded-xl bg-slate-100 p-2 dark:bg-slate-700">
                      <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-600">
                        <Undo2 className="h-5 w-5" />
                      </button>
                      <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-600">
                        <Redo2 className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1">
          {/* Score Canvas with Touch Support - Full width without left panel */}
          <div
            className="relative m-4 flex-1 overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-slate-800"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white shadow-inner dark:border-slate-600">
                <div className="text-center text-slate-500">
                  <FileText className="mx-auto mb-6 h-20 w-20" />
                  <p className="mb-2 text-xl font-medium">{currentSong.title} 악보</p>
                  <p className="mb-2 text-sm">
                    {drawingMode ? 'Apple Pencil 또는 터치로 마크업하세요' : '보기 모드입니다'}
                  </p>
                  <div className="mt-4 text-xs text-slate-400">
                    파일: {currentSong.image} • Key: {currentSong.key}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">← 스와이프로 악보 넘기기 →</div>
                </div>
              </div>
            </div>

            {/* Fullscreen Toggle - Only overlay button remaining */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="absolute top-6 left-6 rounded-lg bg-white/90 p-2 text-slate-600 shadow-lg backdrop-blur-sm hover:bg-white dark:bg-slate-800/90 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>

            {/* Fullscreen Exit Instruction */}
            {isFullscreen && (
              <div className="absolute top-6 right-6 rounded-lg bg-black/70 px-4 py-2 text-sm text-white">
                ESC 또는 버튼을 눌러 전체화면 종료
              </div>
            )}
          </div>

          {/* Right Sidebar - Enhanced with Command Buttons */}
          {!isFullscreen && (
            <div className="flex w-80 flex-col border-l border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              {/* Quick Command Buttons Section - Only for leaders */}
              {selectedProfile?.role === '인도자' && (
                <div className="mb-6">
                  <h3 className="mb-3 flex items-center font-semibold text-slate-800 dark:text-slate-100">
                    <Send className="mr-2 h-4 w-4" />
                    빠른 명령
                  </h3>
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => sendQuickCommand('🔥 더 힘있게!')}
                      className="rounded-xl bg-red-500 p-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:bg-red-600"
                      title="더 힘있게!"
                    >
                      🔥 더 힘있게
                    </button>
                    <button
                      onClick={() => sendQuickCommand('🌊 차분하게')}
                      className="rounded-xl bg-blue-500 p-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-600"
                      title="차분하게"
                    >
                      🌊 차분하게
                    </button>
                    <button
                      onClick={() => sendQuickCommand('⏫ 템포 Up')}
                      className="rounded-xl bg-green-500 p-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:bg-green-600"
                      title="템포 Up"
                    >
                      ⏫ 템포 Up
                    </button>
                    <button
                      onClick={() => sendQuickCommand('⏬ 템포 Down')}
                      className="rounded-xl bg-orange-500 p-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:bg-orange-600"
                      title="템포 Down"
                    >
                      ⏬ 템포 Down
                    </button>
                  </div>
                  <button
                    onClick={() => setShowCommandSendModal(true)}
                    className="flex w-full items-center justify-center rounded-xl bg-slate-200 px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    <Send className="mr-2 h-4 w-4" />더 많은 명령
                  </button>
                </div>
              )}

              {/* Current Song Memo */}
              <div className="mb-6">
                <h3 className="mb-3 flex items-center font-semibold text-slate-800 dark:text-slate-100">
                  <StickyNote className="mr-2 h-4 w-4" />
                  현재 찬양 메모
                </h3>
                {currentSong.memo ? (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                    <p className="text-sm text-slate-800 dark:text-slate-200">{currentSong.memo}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700">
                    <p className="text-sm text-slate-500">메모가 없습니다</p>
                  </div>
                )}
              </div>

              {/* Quick Layer Toggle */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">레이어</h3>
                <div className="space-y-2">
                  {[
                    { name: '내 드로잉', visible: true, color: 'bg-blue-500' },
                    { name: '인도자', visible: true, color: 'bg-red-500' },
                    { name: '반주자', visible: false, color: 'bg-green-500' },
                  ].map((layer, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-700"
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`h-3 w-3 ${layer.color} rounded`}></div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{layer.name}</span>
                      </div>
                      <button className="p-1">
                        {layer.visible ? (
                          <Eye className="h-3 w-3 text-slate-500" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-slate-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Log - Compact */}
              <div className="flex-1">
                <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">활동</h3>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {[
                    {
                      user: '김찬양',
                      action: `${currentSong.title}로 이동`,
                      time: '방금',
                      type: 'nav',
                    },
                    {
                      user: '이피아노',
                      action: '빨간색 마크업',
                      time: '1분',
                      type: 'draw',
                    },
                    {
                      user: '박기타',
                      action: '명령: 더 힘있게',
                      time: '2분',
                      type: 'command',
                    },
                  ].map((log, idx) => (
                    <div key={idx} className="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-700">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{log.user}</p>
                      <p className="truncate text-slate-600 dark:text-slate-400">{log.action}</p>
                      <p className="text-xs text-slate-500">{log.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer - Simplified with prev/next buttons on sides */}
        {!isFullscreen && (
          <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentSongIndex(Math.max(0, currentSongIndex - 1))}
                disabled={currentSongIndex === 0}
                className={`flex items-center space-x-2 rounded-xl px-6 py-3 font-semibold transition-all ${
                  currentSongIndex === 0
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                    : 'bg-blue-600 text-white shadow-lg hover:scale-105 hover:bg-blue-700'
                }`}
              >
                <ArrowLeft className="h-5 w-5" />
                <span>이전</span>
              </button>

              {/* Current Song Info */}
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{currentSong.title}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {currentSongIndex + 1} / {worshipSongs.length} • Key: {currentSong.key}
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentSongIndex(Math.min(worshipSongs.length - 1, currentSongIndex + 1))}
                disabled={currentSongIndex === worshipSongs.length - 1}
                className={`flex items-center space-x-2 rounded-xl px-6 py-3 font-semibold transition-all ${
                  currentSongIndex === worshipSongs.length - 1
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                    : 'bg-blue-600 text-white shadow-lg hover:scale-105 hover:bg-blue-700'
                }`}
              >
                <span>다음</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Command Send Modal - Enhanced for instant send */}
        {showCommandSendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">명령 전송</h3>
                <button
                  onClick={() => setShowCommandSendModal(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6 grid grid-cols-3 gap-4">
                {[
                  { emoji: '🔥', text: '더 힘있게!', color: 'bg-red-500' },
                  { emoji: '🌊', text: '차분하게', color: 'bg-blue-500' },
                  { emoji: '⏫', text: '템포 Up', color: 'bg-green-500' },
                  { emoji: '⏬', text: '템포 Down', color: 'bg-orange-500' },
                  { emoji: '🎵', text: '간주', color: 'bg-purple-500' },
                  { emoji: '🔁', text: '다시', color: 'bg-indigo-500' },
                  { emoji: '⏸️', text: '잠깐 멈춤', color: 'bg-gray-500' },
                  { emoji: '🎯', text: '집중', color: 'bg-yellow-500' },
                  { emoji: '👏', text: '박수', color: 'bg-pink-500' },
                ].map((command, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendCommand(`${command.emoji} ${command.text}`)}
                    className={`${command.color} rounded-xl p-4 text-white shadow-lg transition-all hover:scale-105 active:scale-95`}
                  >
                    <div className="text-center">
                      <div className="mb-1 text-2xl">{command.emoji}</div>
                      <div className="text-sm font-medium">{command.text}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    받는 사람: 전체 멤버 (4명) • 버튼 클릭시 바로 전송
                  </div>
                  <button
                    onClick={() => setShowCommandSendModal(false)}
                    className="rounded-xl bg-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const CommandEditorPage = () => (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">명령 패널 편집</h1>
          <button
            onClick={() => setShowNewCommandDialog(true)}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700"
          >
            <Plus className="mr-2 inline-block h-5 w-5" />새 명령 추가
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {[
            {
              emoji: '🔥',
              text: '더 힘있게!',
              color: 'bg-red-500',
              desc: '강렬한 찬양',
            },
            {
              emoji: '🌊',
              text: '차분하게',
              color: 'bg-blue-500',
              desc: '은은한 찬양',
            },
            {
              emoji: '⏫',
              text: '템포 Up',
              color: 'bg-green-500',
              desc: '빠르게',
            },
            {
              emoji: '⏬',
              text: '템포 Down',
              color: 'bg-orange-500',
              desc: '느리게',
            },
            {
              emoji: '🎵',
              text: '간주',
              color: 'bg-purple-500',
              desc: '연주만',
            },
            { emoji: '🔁', text: '다시', color: 'bg-indigo-500', desc: '반복' },
            {
              emoji: '⏸️',
              text: '잠깐 멈춤',
              color: 'bg-gray-500',
              desc: '일시정지',
            },
            { emoji: '🎯', text: '집중', color: 'bg-yellow-500', desc: '주목' },
            {
              emoji: '👏',
              text: '박수',
              color: 'bg-pink-500',
              desc: '함께 박수',
            },
            {
              emoji: '🙏',
              text: '기도',
              color: 'bg-teal-500',
              desc: '기도 시간',
            },
            {
              emoji: '💫',
              text: '자유롭게',
              color: 'bg-cyan-500',
              desc: '자유 연주',
            },
            {
              emoji: '✨',
              text: '은혜로',
              color: 'bg-violet-500',
              desc: '은혜스럽게',
            },
          ].map((command, idx) => (
            <div
              key={idx}
              className={`${command.color} group relative cursor-pointer rounded-3xl p-6 text-white shadow-lg transition-transform hover:scale-105`}
            >
              <div className="text-center">
                <div className="mb-2 text-3xl">{command.emoji}</div>
                <div className="mb-1 text-lg font-bold">{command.text}</div>
                <div className="text-sm opacity-90">{command.desc}</div>
              </div>

              {/* Edit/Delete Buttons */}
              <div className="absolute top-2 right-2 space-y-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="rounded-lg bg-white/20 p-1 backdrop-blur-sm hover:bg-white/30">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/80 p-1 backdrop-blur-sm hover:bg-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Add New Command Card */}
          <div
            onClick={() => setShowNewCommandDialog(true)}
            className="cursor-pointer rounded-3xl border-2 border-dashed border-slate-400 bg-slate-200 p-6 text-slate-600 shadow-lg transition-all hover:scale-105 hover:bg-slate-300 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
          >
            <div className="text-center">
              <Plus className="mx-auto mb-2 h-8 w-8" />
              <div className="font-bold">새 명령</div>
              <div className="text-sm opacity-75">추가하기</div>
            </div>
          </div>
        </div>

        {/* New Command Dialog */}
        {showNewCommandDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">새 명령 만들기</h3>
                <button
                  onClick={() => setShowNewCommandDialog(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    이모지 선택
                  </label>
                  <div className="grid max-h-32 grid-cols-6 gap-3 overflow-y-auto rounded-xl bg-slate-50 p-3 dark:bg-slate-700">
                    {[
                      '🚀',
                      '💥',
                      '⚡',
                      '🌟',
                      '🎶',
                      '🎤',
                      '🔊',
                      '🎸',
                      '🥁',
                      '🎹',
                      '🎺',
                      '🎻',
                      '❤️',
                      '🙏',
                      '✨',
                      '🔥',
                      '🌊',
                      '⏫',
                      '⏬',
                      '⏸️',
                      '▶️',
                      '🔁',
                      '🎯',
                      '👏',
                    ].map((emoji, idx) => (
                      <button
                        key={idx}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-transparent bg-white text-xl transition-colors hover:border-blue-300 hover:bg-blue-100 dark:bg-slate-600 dark:hover:bg-blue-900/50"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    명령 텍스트
                  </label>
                  <input
                    type="text"
                    placeholder="예: 더 힘있게!"
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    설명 (선택)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 강렬한 찬양"
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">색상 선택</label>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      'bg-red-500',
                      'bg-blue-500',
                      'bg-green-500',
                      'bg-yellow-500',
                      'bg-purple-500',
                      'bg-pink-500',
                      'bg-indigo-500',
                      'bg-orange-500',
                      'bg-teal-500',
                      'bg-gray-500',
                    ].map((color, idx) => (
                      <button
                        key={idx}
                        className={`h-12 w-12 ${color} rounded-xl transition-transform hover:scale-110 ${idx === 0 ? 'ring-2 ring-slate-800 dark:ring-slate-200' : ''}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">미리보기</label>
                  <div className="rounded-2xl bg-red-500 p-4 text-white shadow-lg">
                    <div className="text-center">
                      <div className="mb-1 text-2xl">🔥</div>
                      <div className="mb-1 text-lg font-bold">더 힘있게!</div>
                      <div className="text-sm opacity-90">강렬한 찬양</div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewCommandDialog(false)}
                    className="flex-1 rounded-xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setShowNewCommandDialog(false)}
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

  const AdminPage = () => (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-3xl font-bold text-slate-800 dark:text-slate-100">관리자 패널</h1>

        {/* Tabs */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-slate-800">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex space-x-8 p-6">
              {[
                { id: 'members', label: '멤버' },
                { id: 'server', label: '서버상태' },
                { id: 'data', label: '데이터 관리' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminActiveTab(tab.id)}
                  className={`border-b-2 pb-2 font-semibold transition-colors ${
                    adminActiveTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {adminActiveTab === 'members' ? (
              /* Members Table */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">이름</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">역할</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">상태</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        마지막 접속
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((member, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/50"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`h-10 w-10 ${member.color} flex items-center justify-center rounded-full font-semibold text-white`}
                            >
                              {member.icon}
                            </div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{member.role}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              idx < 2
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {idx < 2 ? 'online' : 'offline'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{idx < 2 ? '현재' : '10분 전'}</td>
                        <td className="px-4 py-4">
                          <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : adminActiveTab === 'data' ? (
              /* Data Management Tab */
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">데이터 백업 및 복구</h3>
                  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <button className="flex items-center justify-center rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white shadow-lg transition-colors hover:bg-blue-700">
                      <Download className="mr-3 h-5 w-5" />
                      전체 데이터 백업
                    </button>
                    <button className="flex items-center justify-center rounded-xl bg-green-600 px-6 py-4 font-semibold text-white shadow-lg transition-colors hover:bg-green-700">
                      <Upload className="mr-3 h-5 w-5" />
                      백업 데이터 복구
                    </button>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-700">
                    <h4 className="mb-2 font-semibold text-slate-800 dark:text-slate-200">백업 히스토리</h4>
                    <div className="space-y-2 text-sm">
                      {[
                        {
                          date: '2024-03-15 14:30',
                          size: '2.3MB',
                          type: '자동 백업',
                        },
                        {
                          date: '2024-03-14 14:30',
                          size: '2.1MB',
                          type: '자동 백업',
                        },
                        {
                          date: '2024-03-13 09:15',
                          size: '1.9MB',
                          type: '수동 백업',
                        },
                      ].map((backup, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg bg-white p-2 dark:bg-slate-600"
                        >
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{backup.date}</span>
                            <span className="ml-2 text-slate-600 dark:text-slate-400">({backup.size})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                              {backup.type}
                            </span>
                            <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">데이터베이스 관리</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-700">
                      <Database className="mx-auto mb-2 h-8 w-8 text-slate-600 dark:text-slate-400" />
                      <h4 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">프로필 데이터</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">4개 프로필</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-700">
                      <FileText className="mx-auto mb-2 h-8 w-8 text-slate-600 dark:text-slate-400" />
                      <h4 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">악보 데이터</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">127개 악보</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-700">
                      <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-600 dark:text-slate-400" />
                      <h4 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">예배 기록</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">23개 예배</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Server Status Tab */
              <div className="space-y-8">
                {/* Server Status Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <div className="mb-3 flex items-center space-x-3">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
                      <h3 className="font-semibold text-green-800 dark:text-green-400">연결 상태</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-300">온라인</p>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-500">모든 클라이언트 연결됨</p>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                    <div className="mb-3 flex items-center space-x-3">
                      <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-blue-800 dark:text-blue-400">CPU 사용률</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">15%</p>
                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-500">정상 범위</p>
                  </div>

                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
                    <div className="mb-3 flex items-center space-x-3">
                      <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <h3 className="font-semibold text-purple-800 dark:text-purple-400">메모리</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">2.1GB</p>
                    <p className="mt-1 text-sm text-purple-700 dark:text-purple-500">총 8GB 중</p>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
                    <div className="mb-3 flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <h3 className="font-semibold text-orange-800 dark:text-orange-400">업타임</h3>
                    </div>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">2h 34m</p>
                    <p className="mt-1 text-sm text-orange-700 dark:text-orange-500">마지막 재시작부터</p>
                  </div>
                </div>

                {/* Real-time Activity */}
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">실시간 활동</h3>
                  <div className="h-64 overflow-y-auto rounded-xl bg-slate-50 p-4 dark:bg-slate-700">
                    <div className="space-y-2 font-mono text-sm">
                      {[
                        '[2024-03-15 14:32:15] 클라이언트 연결: 김찬양 (인도자)',
                        '[2024-03-15 14:32:18] 악보 동기화: 주 은혜임을 - 페이지 1',
                        '[2024-03-15 14:32:22] 명령 전송: 더 힘있게! → 전체',
                        '[2024-03-15 14:32:28] 드로잉 데이터 수신: 이피아노',
                        '[2024-03-15 14:32:35] 페이지 변경: 1 → 2',
                        '[2024-03-15 14:32:40] 명령 전송: 템포 Up → 반주자',
                        '[2024-03-15 14:32:45] 클라이언트 연결해제: 최드럼',
                        '[2024-03-15 14:32:50] 드로잉 데이터 수신: 김찬양 (빨간색 마크업)',
                        '[2024-03-15 14:32:55] 페이지 변경: 2 → 3',
                      ].map((log, idx) => (
                        <div key={idx} className="text-slate-600 dark:text-slate-400">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsPage = () => (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-slate-800 dark:text-slate-100">설정</h1>

        <div className="space-y-6">
          {/* Profile Settings */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <h2 className="mb-4 text-xl font-semibold text-slate-800 dark:text-slate-100">프로필 설정</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div
                  className={`h-16 w-16 ${selectedProfile?.color} flex items-center justify-center rounded-2xl text-2xl`}
                >
                  {selectedProfile?.icon}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="닉네임"
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    defaultValue={selectedProfile?.name}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">역할</label>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  defaultValue={selectedProfile?.role}
                >
                  <option>인도자</option>
                  <option>반주자</option>
                  <option>기타리스트</option>
                  <option>드러머</option>
                  <option>베이시스트</option>
                </select>
              </div>

              {/* Profile Actions */}
              <div className="flex space-x-3 pt-4">
                <button className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700">
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
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`relative h-7 w-14 rounded-full transition-colors ${
                  isDarkMode ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                    isDarkMode ? 'translate-x-7' : 'translate-x-0.5'
                  }`}
                ></div>
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
                <button className="relative h-7 w-14 rounded-full bg-blue-600">
                  <div className="absolute top-0.5 h-6 w-6 translate-x-7 rounded-full bg-white"></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">손바닥 거치 방지</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">손바닥 터치 무시</p>
                </div>
                <button className="relative h-7 w-14 rounded-full bg-blue-600">
                  <div className="absolute top-0.5 h-6 w-6 translate-x-7 rounded-full bg-white"></div>
                </button>
              </div>
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
                      <li>• 프로필 정보 ({selectedProfile?.name})</li>
                      <li>• 개인 설정 및 환경설정</li>
                      <li>• 드로잉 및 마크업 데이터</li>
                      <li>• 활동 기록 및 히스토리</li>
                    </ul>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    정말로 <strong className="text-slate-800 dark:text-slate-200">{selectedProfile?.name}</strong>{' '}
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
                      // Handle profile deletion logic here
                      console.log('Profile deleted:', selectedProfile?.name);
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

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Fixed Sidebar - only when logged in */}
        {isLoggedIn && (
          <div className="fixed top-0 left-0 z-50 flex h-full w-20 flex-col items-center space-y-4 border-r border-slate-200 bg-white py-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
              <Music className="h-6 w-6 text-white" />
            </div>

            {/* Context-aware menu items */}
            {(() => {
              let menuItems = [];

              // Always show worship list as home
              menuItems.push({
                id: 'worship-list',
                icon: Calendar,
                label: '예배목록',
              });

              // Only show admin and settings for admin users
              if (selectedProfile?.role === '인도자') {
                menuItems.push({
                  id: 'command-editor',
                  icon: Edit,
                  label: '명령편집',
                });
                menuItems.push({ id: 'admin', icon: Crown, label: '관리자' });
              }

              menuItems.push({ id: 'settings', icon: Settings, label: '설정' });

              return menuItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(item.id)}
                  className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
                    currentPage === item.id
                      ? 'scale-110 bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                      : 'text-slate-600 hover:scale-105 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                  title={item.label}
                >
                  <item.icon className="h-6 w-6" />
                </button>
              ));
            })()}

            {/* Logout Button */}
            <div className="mt-auto">
              <button
                onClick={handleLogout}
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-600 transition-all duration-200 hover:scale-105 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                title="프로필 변경"
              >
                <User className="h-6 w-6" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content with left margin when logged in */}
        <div className={`${isLoggedIn ? 'ml-20' : ''} min-h-screen`}>
          <PageContent />
        </div>
      </div>
    </div>
  );
};

export default GilteunSystemUiMockup;
