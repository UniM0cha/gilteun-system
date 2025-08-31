import { ArrowLeft, Edit, Plus, Save, Send, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useWebSocketStore } from '../store/websocketStore';

interface Command {
  id: string;
  emoji: string;
  text: string;
  description: string;
  color: string;
}

/**
 * 명령 에디터 페이지
 * - 빠른 명령 템플릿 관리
 * - 실시간 명령 전송
 * - 커스텀 명령 생성
 */
export const CommandEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const { sendCommand, connectionStatus } = useWebSocketStore();

  const [commands, setCommands] = useState<Command[]>([
    { id: '1', emoji: '🔥', text: '더 힘있게!', description: '강렬한 찬양', color: 'bg-red-500' },
    { id: '2', emoji: '🌊', text: '차분하게', description: '은은한 찬양', color: 'bg-blue-500' },
    { id: '3', emoji: '⏫', text: '템포 Up', description: '빠르게', color: 'bg-green-500' },
    { id: '4', emoji: '⏬', text: '템포 Down', description: '느리게', color: 'bg-orange-500' },
    { id: '5', emoji: '🎵', text: '간주', description: '연주만', color: 'bg-purple-500' },
    { id: '6', emoji: '🔁', text: '다시', description: '반복', color: 'bg-indigo-500' },
    { id: '7', emoji: '⏸️', text: '잠깐 멈춤', description: '일시정지', color: 'bg-gray-500' },
    { id: '8', emoji: '🎯', text: '집중', description: '주목', color: 'bg-yellow-500' },
    { id: '9', emoji: '👏', text: '박수', description: '함께 박수', color: 'bg-pink-500' },
    { id: '10', emoji: '🙏', text: '기도', description: '기도 시간', color: 'bg-teal-500' },
    { id: '11', emoji: '💫', text: '자유롭게', description: '자유 연주', color: 'bg-cyan-500' },
    { id: '12', emoji: '✨', text: '은혜로', description: '은혜스럽게', color: 'bg-violet-500' },
  ]);

  const [showNewCommandDialog, setShowNewCommandDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [sendingCommand, setSendingCommand] = useState<Command | null>(null);
  const [commandHistory, setCommandHistory] = useState<Array<{ command: Command; timestamp: Date }>>([]);

  const [newCommandForm, setNewCommandForm] = useState({
    emoji: '🔥',
    text: '',
    description: '',
    color: 'bg-red-500',
  });

  const availableEmojis = [
    '🚀', '💥', '⚡', '🌟', '🎶', '🎤', '🔊', '🎸', '🥁', '🎹',
    '🎺', '🎻', '❤️', '🙏', '✨', '🔥', '🌊', '⏫', '⏬', '⏸️',
    '▶️', '🔁', '🎯', '👏', '💫', '🎇', '🌈', '⭐', '💪', '🕊️'
  ];

  const availableColors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500', 'bg-gray-500',
    'bg-cyan-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500'
  ];

  // 로컬 스토리지에서 명령 로드
  useEffect(() => {
    const savedCommands = localStorage.getItem('gilteun-commands');
    if (savedCommands) {
      try {
        setCommands(JSON.parse(savedCommands));
      } catch (error) {
        console.error('명령 로드 실패:', error);
      }
    }

    const savedHistory = localStorage.getItem('gilteun-command-history');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setCommandHistory(history.map((h: { command: Command; timestamp: string }) => ({ 
          ...h, 
          timestamp: new Date(h.timestamp) 
        })));
      } catch (error) {
        console.error('히스토리 로드 실패:', error);
      }
    }
  }, []);

  // 명령 저장
  const saveCommands = (updatedCommands: Command[]) => {
    setCommands(updatedCommands);
    localStorage.setItem('gilteun-commands', JSON.stringify(updatedCommands));
  };

  // 히스토리 저장
  const saveHistory = (history: Array<{ command: Command; timestamp: Date }>) => {
    setCommandHistory(history);
    localStorage.setItem('gilteun-command-history', JSON.stringify(history));
  };

  // 명령 전송
  const handleSendCommand = (command: Command) => {
    if (connectionStatus !== 'connected') {
      alert('서버에 연결되어 있지 않습니다.');
      return;
    }

    // WebSocket으로 명령 전송
    const message = `${command.emoji} ${command.text} - ${command.description}`;
    sendCommand(message);

    // 히스토리에 추가
    const newHistory = [{ command, timestamp: new Date() }, ...commandHistory].slice(0, 50); // 최대 50개
    saveHistory(newHistory);

    // 전송 피드백
    setSendingCommand(command);
    setShowSendConfirm(true);
    setTimeout(() => {
      setShowSendConfirm(false);
      setSendingCommand(null);
    }, 2000);
  };

  // 새 명령 생성
  const handleCreateCommand = () => {
    if (!newCommandForm.text.trim()) {
      alert('명령 텍스트를 입력하세요.');
      return;
    }

    const newCommand: Command = {
      id: Date.now().toString(),
      emoji: newCommandForm.emoji,
      text: newCommandForm.text,
      description: newCommandForm.description,
      color: newCommandForm.color,
    };

    saveCommands([...commands, newCommand]);
    setShowNewCommandDialog(false);
    setNewCommandForm({ emoji: '🔥', text: '', description: '', color: 'bg-red-500' });
  };

  // 명령 수정
  const handleUpdateCommand = () => {
    if (!editingCommand || !newCommandForm.text.trim()) return;

    const updatedCommands = commands.map((cmd) =>
      cmd.id === editingCommand.id
        ? {
            ...cmd,
            emoji: newCommandForm.emoji,
            text: newCommandForm.text,
            description: newCommandForm.description,
            color: newCommandForm.color,
          }
        : cmd
    );

    saveCommands(updatedCommands);
    setShowEditDialog(false);
    setEditingCommand(null);
  };

  // 명령 삭제
  const handleDeleteCommand = (id: string) => {
    if (confirm('이 명령을 삭제하시겠습니까?')) {
      saveCommands(commands.filter((cmd) => cmd.id !== id));
    }
  };

  // 편집 다이얼로그 열기
  const openEditDialog = (command: Command) => {
    setEditingCommand(command);
    setNewCommandForm({
      emoji: command.emoji,
      text: command.text,
      description: command.description,
      color: command.color,
    });
    setShowEditDialog(true);
  };

  // 사용자 권한 체크
  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/worship')}
              className="text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-3xl font-bold text-slate-800">명령 패널 편집</h1>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${
              connectionStatus === 'connected'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {connectionStatus === 'connected' ? '연결됨' : '연결 끊김'}
            </span>
          </div>
          <button
            onClick={() => setShowNewCommandDialog(true)}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700"
          >
            <Plus className="mr-2 inline-block h-5 w-5" />
            새 명령 추가
          </button>
        </div>

        {/* Command Grid */}
        <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {commands.map((command) => (
            <div
              key={command.id}
              onClick={() => handleSendCommand(command)}
              className={`${command.color} group relative cursor-pointer rounded-3xl p-6 text-white shadow-lg transition-transform hover:scale-105`}
            >
              <div className="text-center">
                <div className="mb-2 text-3xl">{command.emoji}</div>
                <div className="mb-1 text-lg font-bold">{command.text}</div>
                <div className="text-sm opacity-90">{command.description}</div>
              </div>

              {/* Edit/Delete Buttons */}
              <div className="absolute top-2 right-2 space-y-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(command);
                  }}
                  className="rounded-lg bg-white/20 p-1 backdrop-blur-sm hover:bg-white/30"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCommand(command.id);
                  }}
                  className="rounded-lg bg-red-500/80 p-1 backdrop-blur-sm hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Add New Command Card */}
          <div
            onClick={() => setShowNewCommandDialog(true)}
            className="cursor-pointer rounded-3xl border-2 border-dashed border-slate-400 bg-slate-200 p-6 text-slate-600 shadow-lg transition-all hover:scale-105 hover:bg-slate-300"
          >
            <div className="text-center">
              <Plus className="mx-auto mb-2 h-8 w-8" />
              <div className="font-bold">새 명령</div>
              <div className="text-sm opacity-75">추가하기</div>
            </div>
          </div>
        </div>

        {/* Command History */}
        {commandHistory.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-slate-800">최근 전송 내역</h2>
            <div className="space-y-2">
              {commandHistory.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{item.command.emoji}</span>
                    <div>
                      <span className="font-medium text-slate-800">{item.command.text}</span>
                      <span className="ml-2 text-sm text-slate-500">{item.command.description}</span>
                    </div>
                  </div>
                  <span className="text-sm text-slate-500">
                    {item.timestamp.toLocaleTimeString('ko-KR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New/Edit Command Dialog */}
        {(showNewCommandDialog || showEditDialog) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-800">
                  {showEditDialog ? '명령 수정' : '새 명령 만들기'}
                </h3>
                <button
                  onClick={() => {
                    setShowNewCommandDialog(false);
                    setShowEditDialog(false);
                    setEditingCommand(null);
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Emoji Selection */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">이모지 선택</label>
                  <div className="grid max-h-32 grid-cols-6 gap-3 overflow-y-auto rounded-xl bg-slate-50 p-3">
                    {availableEmojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewCommandForm({ ...newCommandForm, emoji })}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xl transition-colors ${
                          newCommandForm.emoji === emoji
                            ? 'border-blue-500 bg-blue-100'
                            : 'border-transparent bg-white hover:border-blue-300'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Command Text */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">명령 텍스트</label>
                  <input
                    type="text"
                    placeholder="예: 더 힘있게!"
                    value={newCommandForm.text}
                    onChange={(e) => setNewCommandForm({ ...newCommandForm, text: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">설명 (선택)</label>
                  <input
                    type="text"
                    placeholder="예: 강렬한 찬양"
                    value={newCommandForm.description}
                    onChange={(e) => setNewCommandForm({ ...newCommandForm, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-800"
                  />
                </div>

                {/* Color Selection */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">색상 선택</label>
                  <div className="grid grid-cols-5 gap-3">
                    {availableColors.map((color, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewCommandForm({ ...newCommandForm, color })}
                        className={`h-12 w-12 ${color} rounded-xl transition-transform hover:scale-110 ${
                          newCommandForm.color === color ? 'ring-2 ring-slate-800' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">미리보기</label>
                  <div className={`${newCommandForm.color} rounded-2xl p-4 text-white shadow-lg`}>
                    <div className="text-center">
                      <div className="mb-1 text-2xl">{newCommandForm.emoji}</div>
                      <div className="mb-1 text-lg font-bold">{newCommandForm.text || '명령 텍스트'}</div>
                      <div className="text-sm opacity-90">{newCommandForm.description || '설명'}</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowNewCommandDialog(false);
                      setShowEditDialog(false);
                      setEditingCommand(null);
                    }}
                    className="flex-1 rounded-xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    취소
                  </button>
                  <button
                    onClick={showEditDialog ? handleUpdateCommand : handleCreateCommand}
                    className="flex-1 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700"
                  >
                    <Save className="mr-2 inline-block h-4 w-4" />
                    {showEditDialog ? '수정' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Confirmation Toast */}
        {showSendConfirm && sendingCommand && (
          <div className="fixed bottom-8 right-8 z-50 animate-pulse">
            <div className={`${sendingCommand.color} flex items-center space-x-3 rounded-2xl px-6 py-4 text-white shadow-xl`}>
              <Send className="h-5 w-5" />
              <span className="font-semibold">명령 전송됨: {sendingCommand.text}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};