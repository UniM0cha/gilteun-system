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
    { id: 2, name: '이피아노', role: '반주자', icon: '🎹', color: 'bg-green-500' },
    { id: 3, name: '박기타', role: '기타리스트', icon: '🎸', color: 'bg-purple-500' },
    { id: 4, name: '최드럼', role: '드러머', icon: '🥁', color: 'bg-orange-500' },
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
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <Music className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-3">길튼 시스템</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">교회 찬양팀 예배 지원 시스템</p>
        </div>

        {/* Profile Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">프로필 선택</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => handleProfileSelect(profile)}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-300"
              >
                <div
                  className={`w-16 h-16 ${profile.color} rounded-2xl flex items-center justify-center text-2xl mb-4 mx-auto`}>
                  {profile.icon}
                </div>
                <h3 className="font-semibold text-lg text-center text-slate-800 dark:text-slate-100">{profile.name}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-center text-sm mt-1">{profile.role}</p>
              </div>
            ))}

            {/* New Profile Card */}
            <div
              onClick={() => setShowNewProfileDialog(true)}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400"
            >
              <div
                className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                <Plus className="w-8 h-8 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="font-semibold text-lg text-center text-slate-600 dark:text-slate-400">새 프로필</h3>
            </div>
          </div>
        </div>

        {/* New Profile Dialog */}
        {showNewProfileDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">새 프로필 생성</h3>
                <button
                  onClick={() => setShowNewProfileDialog(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">이름</label>
                  <input
                    type="text"
                    placeholder="이름을 입력하세요"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">역할</label>
                  <select
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    <option>인도자</option>
                    <option>반주자</option>
                    <option>기타리스트</option>
                    <option>드러머</option>
                    <option>베이시스트</option>
                    <option>보컬</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">아이콘 선택</label>
                  <div className="grid grid-cols-6 gap-3">
                    {['👨‍🎤', '👩‍🎤', '🎹', '🎸', '🥁', '🎤', '🎵', '🎶', '🎼', '🎺', '🎻', '🎷'].map((icon, idx) => (
                      <button key={idx}
                              className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-xl hover:bg-blue-100 dark:hover:bg-blue-900/50">
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewProfileDialog(false)}
                    className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-xl"
                  >
                    취소
                  </button>
                  <button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg">
                    <Save className="w-4 h-4 inline-block mr-2" />
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <User className="w-5 h-5" />
              <span>{selectedProfile?.name}</span>
            </button>
            <span className="text-slate-400">|</span>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">예배 목록</h1>
          </div>
          <button
            onClick={() => setShowNewWorshipDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
          >
            <Plus className="w-5 h-5 inline-block mr-2" />
            새 예배 생성
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar Section */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">날짜 선택</h2>

            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">2024년 3월</h3>
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
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
                    onClick={() => isCurrentMonth && setSelectedDate(`2024-03-${dayNumber.toString().padStart(2, '0')}`)}
                    className={`p-3 text-sm rounded-lg transition-colors relative ${
                      !isCurrentMonth
                        ? 'text-slate-300 dark:text-slate-600'
                        : isSelected
                          ? 'bg-blue-600 text-white font-semibold'
                          : hasWorship
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isCurrentMonth ? dayNumber : ''}
                    {hasWorship && !isSelected && (
                      <div
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-400 text-center">
              <span className="inline-flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>예배 있는 날</span>
              </span>
            </div>
          </div>

          {/* Selected Date Worship List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                3월 15일 예배
              </h2>
              <span
                className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                금요일
              </span>
            </div>

            <div className="space-y-4">
              {[
                { id: 1, title: '금요 기도회', time: '19:30', status: '예정', participants: 8 },
                { id: 2, title: '청년 기도회', time: '21:00', status: '예정', participants: 12 },
              ].map((worship) => (
                <div key={worship.id}
                     className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => setCurrentPage('song-list')}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{worship.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        <Clock className="w-4 h-4 inline-block mr-1" />
                        {worship.time}
                      </p>
                    </div>
                    <span
                      className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded-full text-xs font-medium">
                      {worship.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      참석자 {worship.participants}명
                    </div>
                    <button
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm">
                      진행하기
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State when no worship on selected date */}
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">선택한 날짜에 예배가 없습니다</p>
              <button
                onClick={() => setShowNewWorshipDialog(true)}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                새 예배를 생성하시겠습니까?
              </button>
            </div>
          </div>
        </div>

        {/* New Worship Dialog - Enhanced */}
        {showNewWorshipDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">새 예배 생성</h3>
                <button
                  onClick={() => setShowNewWorshipDialog(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">예배 유형</label>
                  <select
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200">
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">사용자 정의
                    예배명</label>
                  <input
                    type="text"
                    placeholder="예배명을 직접 입력하세요 (선택사항)"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">날짜</label>
                    <input
                      type="date"
                      value={selectedDate}
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">시간</label>
                    <input
                      type="time"
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">설명 (선택)</label>
                  <textarea
                    rows={3}
                    placeholder="예배에 대한 간단한 설명을 작성하세요"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-none"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewWorshipDialog(false)}
                    className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-xl"
                  >
                    취소
                  </button>
                  <button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg">
                    <Save className="w-4 h-4 inline-block mr-2" />
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
      { id: 1, title: '주 은혜임을', key: 'G', memo: '2절 후 간주 길게', hasScore: true, image: 'score1.jpg' },
      { id: 2, title: '살아계신 주', key: 'C', memo: '템포 조금 느리게', hasScore: true, image: 'score2.jpg' },
      { id: 3, title: '나의 반석이신 하나님', key: 'F', memo: '', hasScore: true, image: 'score3.jpg' },
      { id: 4, title: '십자가 그 사랑', key: 'D', memo: '마지막 코러스 반복', hasScore: true, image: 'score4.jpg' },
    ];

    const reorderedSongs = songOrder.map(index => songs[index - 1]);

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('worship-list')}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">찬양 목록</h1>
              <span
                className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                금요 기도회
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBulkUploadDialog(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
              >
                <Upload className="w-5 h-5 inline-block mr-2" />
                악보 일괄 업로드
              </button>
            </div>
          </div>

          {/* Song Order List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">찬양 순서</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                드래그하여 순서 변경
              </div>
            </div>

            <div className="space-y-3">
              {reorderedSongs.map((song, index) => (
                <div key={`${song.id}-${index}`}
                     className="group border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-all cursor-move bg-white dark:bg-slate-750">
                  <div className="flex items-center space-x-4">
                    {/* Drag Handle */}
                    <div className="flex items-center space-x-3">
                      <div
                        className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400">
                        <Grid3X3 className="w-5 h-5" />
                      </div>
                      <div
                        className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                    </div>

                    {/* Score Preview */}
                    <div
                      className="w-12 h-16 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-slate-500" />
                    </div>

                    {/* Song Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{song.title}</h3>
                        <span
                          className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full text-xs font-medium">
                          {song.key}
                        </span>
                        <span
                          className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                          악보 있음
                        </span>
                      </div>

                      {/* Memo Display Only */}
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {song.memo || '메모 없음'}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditSong(song)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-2"
                        title="편집"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-500 hover:text-red-700 p-2" title="삭제">
                        <Trash2 className="w-4 h-4" />
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
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Play className="w-6 h-6 inline-block mr-3" />
                예배 시작하기
              </button>
            </div>
          </div>

          {/* Song Edit Dialog */}
          {showSongEditDialog && editingSong && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">찬양 편집</h3>
                  <button
                    onClick={() => setShowSongEditDialog(false)}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">찬양 제목</label>
                    <input
                      type="text"
                      defaultValue={editingSong.title}
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">키 (Key)</label>
                    <select
                      defaultValue={editingSong.key}
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">메모</label>
                    <textarea
                      rows={3}
                      defaultValue={editingSong.memo}
                      placeholder="찬양에 대한 메모를 입력하세요..."
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-none"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowSongEditDialog(false)}
                      className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-xl"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => setShowSongEditDialog(false)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
                    >
                      <Save className="w-4 h-4 inline-block mr-2" />
                      저장
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Upload Dialog */}
          {showBulkUploadDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">악보 일괄 업로드</h3>
                  <button
                    onClick={() => setShowBulkUploadDialog(false)}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  악보 이미지 1개 = 찬양 1개로 업로드됩니다
                </p>

                {/* Upload Zone */}
                <div
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer mb-6">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">악보를 드래그하거나</p>
                  <p className="text-sm text-slate-500">클릭하여 여러 장 선택</p>
                </div>

                {/* Uploaded Files with Edit Options */}
                <div className="space-y-4 mb-6">
                  {[
                    { id: 1, filename: 'score1.jpg', tempTitle: '찬양 1', key: 'C', memo: '', size: '1.2MB' },
                    { id: 2, filename: 'score2.jpg', tempTitle: '찬양 2', key: 'G', memo: '', size: '980KB' },
                    { id: 3, filename: 'score3.jpg', tempTitle: '찬양 3', key: 'D', memo: '', size: '1.5MB' },
                  ].map((file) => (
                    <div key={file.id}
                         className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-700">
                      {/* File Info Header */}
                      <div className="flex items-center space-x-3 mb-4">
                        <div
                          className="w-12 h-16 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-mono text-slate-500 dark:text-slate-400 truncate mb-1">{file.filename}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{file.size}</p>
                        </div>
                        <button className="text-red-500 hover:text-red-700 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Editable Song Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">찬양
                            제목</label>
                          <input
                            type="text"
                            defaultValue={file.tempTitle}
                            className="w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">코드
                            (Key)</label>
                          <select
                            defaultValue={file.key}
                            className="w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200"
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
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">메모
                            (선택)</label>
                          <input
                            type="text"
                            defaultValue={file.memo}
                            placeholder="찬양에 대한 메모..."
                            className="w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200"
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
                    className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-xl"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setShowBulkUploadDialog(false)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
                  >
                    <Save className="w-4 h-4 inline-block mr-2" />
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
      { id: 1, title: '주 은혜임을', key: 'G', memo: '2절 후 간주 길게', image: 'score1.jpg' },
      { id: 2, title: '살아계신 주', key: 'C', memo: '템포 조금 느리게', image: 'score2.jpg' },
      { id: 3, title: '나의 반석이신 하나님', key: 'F', memo: '', image: 'score3.jpg' },
      { id: 4, title: '십자가 그 사랑', key: 'D', memo: '마지막 코러스 반복', image: 'score4.jpg' },
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
        className={`min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        {/* Top Toolbar - Hide in fullscreen */}
        {!isFullscreen && (
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentPage('song-list')}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{currentSong.title}</h2>
                <span className="text-slate-500">찬양 {currentSongIndex + 1}/{worshipSongs.length}</span>
                <span
                  className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-sm font-medium">
                  Key: {currentSong.key}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                {/* View/Draw Mode Toggle */}
                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700 rounded-xl p-2">
                  <button
                    onClick={() => setDrawingMode(false)}
                    className={`p-2 rounded-lg transition-colors ${!drawingMode ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400'}`}
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDrawingMode(true)}
                    className={`p-2 rounded-lg transition-colors ${drawingMode ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400'}`}
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawing Tools - Show only in drawing mode */}
                {drawingMode && (
                  <>
                    <div className="flex space-x-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-2">
                      {['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'].map((color, idx) => (
                        <button key={idx}
                                className={`w-8 h-8 ${color} rounded-lg hover:scale-110 transition-transform ${idx === 1 ? 'ring-2 ring-slate-800 dark:ring-slate-200' : ''}`} />
                      ))}
                    </div>

                    {/* Pen Thickness Slider */}
                    <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700 rounded-xl p-3">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">굵기</span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={penThickness}
                        onChange={(e) => setPenThickness(e.target.value)}
                        className="w-16 h-1 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-mono w-4">{penThickness}</span>
                    </div>

                    <div className="flex space-x-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-2">
                      <button
                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400">
                        <Undo2 className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400">
                        <Redo2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Score Canvas with Touch Support - Full width without left panel */}
          <div
            className="flex-1 relative bg-white dark:bg-slate-800 m-4 rounded-2xl shadow-lg overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-full h-full bg-white rounded-xl shadow-inner border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <FileText className="w-20 h-20 mx-auto mb-6" />
                  <p className="text-xl font-medium mb-2">{currentSong.title} 악보</p>
                  <p className="text-sm mb-2">{drawingMode ? 'Apple Pencil 또는 터치로 마크업하세요' : '보기 모드입니다'}</p>
                  <div className="mt-4 text-xs text-slate-400">
                    파일: {currentSong.image} • Key: {currentSong.key}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    ← 스와이프로 악보 넘기기 →
                  </div>
                </div>
              </div>
            </div>

            {/* Fullscreen Toggle - Only overlay button remaining */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="absolute top-6 left-6 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 p-2 rounded-lg shadow-lg backdrop-blur-sm"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Fullscreen Exit Instruction */}
            {isFullscreen && (
              <div className="absolute top-6 right-6 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                ESC 또는 버튼을 눌러 전체화면 종료
              </div>
            )}
          </div>

          {/* Right Sidebar - Enhanced with Command Buttons */}
          {!isFullscreen && (
            <div
              className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-4 flex flex-col">
              {/* Quick Command Buttons Section - Only for leaders */}
              {selectedProfile?.role === '인도자' && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-100 flex items-center">
                    <Send className="w-4 h-4 mr-2" />
                    빠른 명령
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => sendQuickCommand('🔥 더 힘있게!')}
                      className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105 text-sm font-medium"
                      title="더 힘있게!"
                    >
                      🔥 더 힘있게
                    </button>
                    <button
                      onClick={() => sendQuickCommand('🌊 차분하게')}
                      className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105 text-sm font-medium"
                      title="차분하게"
                    >
                      🌊 차분하게
                    </button>
                    <button
                      onClick={() => sendQuickCommand('⏫ 템포 Up')}
                      className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105 text-sm font-medium"
                      title="템포 Up"
                    >
                      ⏫ 템포 Up
                    </button>
                    <button
                      onClick={() => sendQuickCommand('⏬ 템포 Down')}
                      className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105 text-sm font-medium"
                      title="템포 Down"
                    >
                      ⏬ 템포 Down
                    </button>
                  </div>
                  <button
                    onClick={() => setShowCommandSendModal(true)}
                    className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    더 많은 명령
                  </button>
                </div>
              )}

              {/* Current Song Memo */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-100 flex items-center">
                  <StickyNote className="w-4 h-4 mr-2" />
                  현재 찬양 메모
                </h3>
                {currentSong.memo ? (
                  <div
                    className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
                    <p className="text-slate-800 dark:text-slate-200 text-sm">{currentSong.memo}</p>
                  </div>
                ) : (
                  <div
                    className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3">
                    <p className="text-slate-500 text-sm">메모가 없습니다</p>
                  </div>
                )}
              </div>

              {/* Quick Layer Toggle */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-100 text-sm">레이어</h3>
                <div className="space-y-2">
                  {[
                    { name: '내 드로잉', visible: true, color: 'bg-blue-500' },
                    { name: '인도자', visible: true, color: 'bg-red-500' },
                    { name: '반주자', visible: false, color: 'bg-green-500' },
                  ].map((layer, idx) => (
                    <div key={idx}
                         className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 ${layer.color} rounded`}></div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{layer.name}</span>
                      </div>
                      <button className="p-1">
                        {layer.visible ? <Eye className="w-3 h-3 text-slate-500" /> :
                          <EyeOff className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Log - Compact */}
              <div className="flex-1">
                <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-100 text-sm">활동</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {[
                    { user: '김찬양', action: `${currentSong.title}로 이동`, time: '방금', type: 'nav' },
                    { user: '이피아노', action: '빨간색 마크업', time: '1분', type: 'draw' },
                    { user: '박기타', action: '명령: 더 힘있게', time: '2분', type: 'command' },
                  ].map((log, idx) => (
                    <div key={idx} className="text-xs p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{log.user}</p>
                      <p className="text-slate-600 dark:text-slate-400 truncate">{log.action}</p>
                      <p className="text-slate-500 text-xs">{log.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer - Simplified with prev/next buttons on sides */}
        {!isFullscreen && (
          <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentSongIndex(Math.max(0, currentSongIndex - 1))}
                disabled={currentSongIndex === 0}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  currentSongIndex === 0
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:scale-105'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
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
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  currentSongIndex === worshipSongs.length - 1
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:scale-105'
                }`}
              >
                <span>다음</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Command Send Modal - Enhanced for instant send */}
        {showCommandSendModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">명령 전송</h3>
                <button
                  onClick={() => setShowCommandSendModal(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
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
                    className={`${command.color} hover:scale-105 active:scale-95 text-white p-4 rounded-xl shadow-lg transition-all`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">{command.emoji}</div>
                      <div className="font-medium text-sm">{command.text}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    받는 사람: 전체 멤버 (4명) • 버튼 클릭시 바로 전송
                  </div>
                  <button
                    onClick={() => setShowCommandSendModal(false)}
                    className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-2 px-4 rounded-xl"
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">명령 패널 편집</h1>
          <button
            onClick={() => setShowNewCommandDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
          >
            <Plus className="w-5 h-5 inline-block mr-2" />
            새 명령 추가
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[
            { emoji: '🔥', text: '더 힘있게!', color: 'bg-red-500', desc: '강렬한 찬양' },
            { emoji: '🌊', text: '차분하게', color: 'bg-blue-500', desc: '은은한 찬양' },
            { emoji: '⏫', text: '템포 Up', color: 'bg-green-500', desc: '빠르게' },
            { emoji: '⏬', text: '템포 Down', color: 'bg-orange-500', desc: '느리게' },
            { emoji: '🎵', text: '간주', color: 'bg-purple-500', desc: '연주만' },
            { emoji: '🔁', text: '다시', color: 'bg-indigo-500', desc: '반복' },
            { emoji: '⏸️', text: '잠깐 멈춤', color: 'bg-gray-500', desc: '일시정지' },
            { emoji: '🎯', text: '집중', color: 'bg-yellow-500', desc: '주목' },
            { emoji: '👏', text: '박수', color: 'bg-pink-500', desc: '함께 박수' },
            { emoji: '🙏', text: '기도', color: 'bg-teal-500', desc: '기도 시간' },
            { emoji: '💫', text: '자유롭게', color: 'bg-cyan-500', desc: '자유 연주' },
            { emoji: '✨', text: '은혜로', color: 'bg-violet-500', desc: '은혜스럽게' },
          ].map((command, idx) => (
            <div key={idx}
                 className={`${command.color} text-white p-6 rounded-3xl shadow-lg relative group cursor-pointer hover:scale-105 transition-transform`}>
              <div className="text-center">
                <div className="text-3xl mb-2">{command.emoji}</div>
                <div className="font-bold text-lg mb-1">{command.text}</div>
                <div className="text-sm opacity-90">{command.desc}</div>
              </div>

              {/* Edit/Delete Buttons */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-y-1">
                <button className="bg-white/20 hover:bg-white/30 p-1 rounded-lg backdrop-blur-sm">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="bg-red-500/80 hover:bg-red-600 p-1 rounded-lg backdrop-blur-sm">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Add New Command Card */}
          <div
            onClick={() => setShowNewCommandDialog(true)}
            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 p-6 rounded-3xl shadow-lg cursor-pointer transition-all border-2 border-dashed border-slate-400 dark:border-slate-500 hover:scale-105"
          >
            <div className="text-center">
              <Plus className="w-8 h-8 mx-auto mb-2" />
              <div className="font-bold">새 명령</div>
              <div className="text-sm opacity-75">추가하기</div>
            </div>
          </div>
        </div>

        {/* New Command Dialog */}
        {showNewCommandDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">새 명령 만들기</h3>
                <button
                  onClick={() => setShowNewCommandDialog(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">이모지 선택</label>
                  <div
                    className="grid grid-cols-6 gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl max-h-32 overflow-y-auto">
                    {['🚀', '💥', '⚡', '🌟', '🎶', '🎤', '🔊', '🎸', '🥁', '🎹', '🎺', '🎻',
                      '❤️', '🙏', '✨', '🔥', '🌊', '⏫', '⏬', '⏸️', '▶️', '🔁', '🎯', '👏'].map((emoji, idx) => (
                      <button key={idx}
                              className="w-10 h-10 bg-white dark:bg-slate-600 rounded-lg flex items-center justify-center text-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 border-2 border-transparent hover:border-blue-300 transition-colors">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">명령 텍스트</label>
                  <input
                    type="text"
                    placeholder="예: 더 힘있게!"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">설명 (선택)</label>
                  <input
                    type="text"
                    placeholder="예: 강렬한 찬양"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">색상 선택</label>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
                      'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500', 'bg-gray-500',
                    ].map((color, idx) => (
                      <button key={idx}
                              className={`w-12 h-12 ${color} rounded-xl hover:scale-110 transition-transform ${idx === 0 ? 'ring-2 ring-slate-800 dark:ring-slate-200' : ''}`} />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">미리보기</label>
                  <div className="bg-red-500 text-white p-4 rounded-2xl shadow-lg">
                    <div className="text-center">
                      <div className="text-2xl mb-1">🔥</div>
                      <div className="font-bold text-lg mb-1">더 힘있게!</div>
                      <div className="text-sm opacity-90">강렬한 찬양</div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewCommandDialog(false)}
                    className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-xl"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setShowNewCommandDialog(false)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
                  >
                    <Save className="w-4 h-4 inline-block mr-2" />
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-800 dark:text-slate-100">관리자 패널</h1>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
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
                  className={`font-semibold pb-2 border-b-2 transition-colors ${
                    adminActiveTab === tab.id ? 'text-blue-600 border-blue-600' : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
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
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">이름</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">역할</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">상태</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">마지막 접속</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">관리</th>
                  </tr>
                  </thead>
                  <tbody>
                  {profiles.map((member, idx) => (
                    <tr key={idx}
                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 ${member.color} rounded-full flex items-center justify-center text-white font-semibold`}>
                            {member.icon}
                          </div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{member.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{member.role}</td>
                      <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            idx < 2
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {idx < 2 ? 'online' : 'offline'}
                          </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                        {idx < 2 ? '현재' : '10분 전'}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          <MoreHorizontal className="w-4 h-4" />
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
                  <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">데이터 백업 및 복구</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-colors flex items-center justify-center">
                      <Download className="w-5 h-5 mr-3" />
                      전체 데이터 백업
                    </button>
                    <button
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-colors flex items-center justify-center">
                      <Upload className="w-5 h-5 mr-3" />
                      백업 데이터 복구
                    </button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">백업 히스토리</h4>
                    <div className="space-y-2 text-sm">
                      {[
                        { date: '2024-03-15 14:30', size: '2.3MB', type: '자동 백업' },
                        { date: '2024-03-14 14:30', size: '2.1MB', type: '자동 백업' },
                        { date: '2024-03-13 09:15', size: '1.9MB', type: '수동 백업' },
                      ].map((backup, idx) => (
                        <div key={idx}
                             className="flex justify-between items-center p-2 bg-white dark:bg-slate-600 rounded-lg">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{backup.date}</span>
                            <span className="ml-2 text-slate-600 dark:text-slate-400">({backup.size})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                              {backup.type}
                            </span>
                            <button
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">데이터베이스 관리</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 text-center">
                      <Database className="w-8 h-8 mx-auto mb-2 text-slate-600 dark:text-slate-400" />
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">프로필 데이터</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">4개 프로필</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 text-center">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600 dark:text-slate-400" />
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">악보 데이터</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">127개 악보</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 text-center">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-600 dark:text-slate-400" />
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">예배 기록</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">23개 예배</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Server Status Tab */
              <div className="space-y-8">
                {/* Server Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div
                    className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <h3 className="font-semibold text-green-800 dark:text-green-400">연결 상태</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-300">온라인</p>
                    <p className="text-sm text-green-700 dark:text-green-500 mt-1">모든 클라이언트 연결됨</p>
                  </div>

                  <div
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-blue-800 dark:text-blue-400">CPU 사용률</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">15%</p>
                    <p className="text-sm text-blue-700 dark:text-blue-500 mt-1">정상 범위</p>
                  </div>

                  <div
                    className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h3 className="font-semibold text-purple-800 dark:text-purple-400">메모리</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">2.1GB</p>
                    <p className="text-sm text-purple-700 dark:text-purple-500 mt-1">총 8GB 중</p>
                  </div>

                  <div
                    className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      <h3 className="font-semibold text-orange-800 dark:text-orange-400">업타임</h3>
                    </div>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">2h 34m</p>
                    <p className="text-sm text-orange-700 dark:text-orange-500 mt-1">마지막 재시작부터</p>
                  </div>
                </div>

                {/* Real-time Activity */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">실시간 활동</h3>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 h-64 overflow-y-auto">
                    <div className="space-y-2 text-sm font-mono">
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-800 dark:text-slate-100">설정</h1>

        <div className="space-y-6">
          {/* Profile Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">프로필 설정</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-16 h-16 ${selectedProfile?.color} rounded-2xl flex items-center justify-center text-2xl`}>
                  {selectedProfile?.icon}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="닉네임"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    defaultValue={selectedProfile?.name}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">역할</label>
                <select
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
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
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg">
                  <Save className="w-4 h-4 inline-block mr-2" />
                  프로필 저장
                </button>
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">테마 설정</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">다크 모드</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">어두운 테마로 전환</p>
              </div>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-14 h-7 rounded-full transition-colors relative ${
                  isDarkMode ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div className={`w-6 h-6 rounded-full bg-white absolute top-0.5 transition-transform ${
                  isDarkMode ? 'translate-x-7' : 'translate-x-0.5'
                }`}></div>
              </button>
            </div>
          </div>

          {/* Input Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">입력 설정</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">Apple Pencil 압력 감지</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">필압에 따라 선 굵기 조절</p>
                </div>
                <button className="w-14 h-7 rounded-full bg-blue-600 relative">
                  <div className="w-6 h-6 rounded-full bg-white absolute top-0.5 translate-x-7"></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">손바닥 거치 방지</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">손바닥 터치 무시</p>
                </div>
                <button className="w-14 h-7 rounded-full bg-blue-600 relative">
                  <div className="w-6 h-6 rounded-full bg-white absolute top-0.5 translate-x-7"></div>
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-800 dark:text-red-400">위험 구역</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-red-800 dark:text-red-400 mb-2">프로필 완전 삭제</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                  이 작업은 되돌릴 수 없습니다. 프로필과 관련된 모든 데이터가 영구적으로 삭제됩니다.
                </p>
                <button
                  onClick={() => setShowDeleteConfirmDialog(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-xl shadow-lg"
                >
                  <Trash2 className="w-4 h-4 inline-block mr-2" />
                  프로필 영구 삭제
                </button>
              </div>
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirmDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center space-x-3 mb-6">
                  <div
                    className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">프로필 완전 삭제</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">이 작업은 되돌릴 수 없습니다</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                    <p className="text-red-800 dark:text-red-300 text-sm font-medium mb-2">삭제될 데이터:</p>
                    <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                      <li>• 프로필 정보 ({selectedProfile?.name})</li>
                      <li>• 개인 설정 및 환경설정</li>
                      <li>• 드로잉 및 마크업 데이터</li>
                      <li>• 활동 기록 및 히스토리</li>
                    </ul>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    정말로 <strong className="text-slate-800 dark:text-slate-200">{selectedProfile?.name}</strong> 프로필을
                    영구적으로 삭제하시겠습니까?
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirmDialog(false)}
                    className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-xl"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirmDialog(false);
                      // Handle profile deletion logic here
                      console.log('Profile deleted:', selectedProfile?.name);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
                  >
                    <Trash2 className="w-4 h-4 inline-block mr-2" />
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
          <div
            className="fixed left-0 top-0 h-full w-20 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col items-center py-6 space-y-4 z-50">
            <div
              className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <Music className="w-6 h-6 text-white" />
            </div>

            {/* Context-aware menu items */}
            {(() => {
              let menuItems = [];

              // Always show worship list as home
              menuItems.push({ id: 'worship-list', icon: Calendar, label: '예배목록' });

              // Only show admin and settings for admin users
              if (selectedProfile?.role === '인도자') {
                menuItems.push({ id: 'command-editor', icon: Edit, label: '명령편집' });
                menuItems.push({ id: 'admin', icon: Crown, label: '관리자' });
              }

              menuItems.push({ id: 'settings', icon: Settings, label: '설정' });

              return menuItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group relative ${
                    currentPage === item.id
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 scale-110'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105'
                  }`}
                  title={item.label}
                >
                  <item.icon className="w-6 h-6" />
                </button>
              ));
            })()}

            {/* Logout Button */}
            <div className="mt-auto">
              <button
                onClick={handleLogout}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105 transition-all duration-200"
                title="프로필 변경"
              >
                <User className="w-6 h-6" />
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
