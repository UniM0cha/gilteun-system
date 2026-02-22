import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Plus, Trash2, RotateCcw, Save } from "lucide-react";
import { useCommandStore } from "../store/commandStore";

export default function CommandSetup() {
  const { commands, addCommand: addCommandToStore, deleteCommand: deleteCommandFromStore, resetToDefault } = useCommandStore();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEmoji, setNewEmoji] = useState("🎵");
  const [newLabel, setNewLabel] = useState("");

  const addCommand = () => {
    if (newLabel.trim()) {
      addCommandToStore({
        emoji: newEmoji,
        label: newLabel,
        isDefault: false
      });
      setNewLabel("");
      setNewEmoji("🎵");
      setIsAddingNew(false);
    }
  };

  const deleteCommand = (id: number) => {
    deleteCommandFromStore(id);
  };

  const handleResetToDefault = () => {
    if (confirm("기본 명령으로 초기화하시겠습니까?")) {
      resetToDefault();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">명령 설정</h1>
            <p className="text-slate-600">예배 중 사용할 명령을 관리하세요</p>
          </div>
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-2 px-5 py-3 bg-orange-50 text-orange-600 rounded-xl font-semibold hover:bg-orange-100 transition-colors active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            초기화
          </button>
        </div>

        {/* 명령 그리드 */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              현재 명령 ({commands.length})
            </h2>
            <button
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md active:scale-95"
            >
              <Plus className="w-5 h-5" />
              새 명령 추가
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {commands.map((command) => (
              <div
                key={command.id}
                className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 shadow-md border-2 border-transparent transition-all"
              >
                <div className="flex flex-col items-center gap-3 mb-3">
                  <span className="text-6xl">{command.emoji}</span>
                  <span className="text-sm font-semibold text-slate-700 text-center">
                    {command.label}
                  </span>
                  {command.isDefault && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">
                      기본 명령
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteCommand(command.id)}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl transition-all active:scale-95 border-2 border-red-200 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">삭제</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 새 명령 추가 모달 */}
        {isAddingNew && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full animate-in zoom-in duration-200">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">
                새 명령 추가
              </h3>

              {/* 이모티콘 입력 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  이모티콘 *
                </label>
                <input
                  type="text"
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  placeholder="예: 🎵 🎶 🎸 ✨ (직접 입력하세요)"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-3xl text-center transition-colors"
                  maxLength={4}
                />
                <p className="text-xs text-slate-500 mt-2 text-center">
                  💡 키보드 이모티콘 입력 또는 복사/붙여넣기로 추가하세요
                </p>
              </div>

              {/* 라벨 입력 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  명령 이름 *
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="예: 후렴구, 다같이 등"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg transition-colors"
                />
              </div>

              {/* 미리보기 */}
              <div className="mb-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
                <div className="text-sm font-semibold text-slate-600 mb-3 text-center">
                  미리보기
                </div>
                <div className="flex flex-col items-center gap-3">
                  <span className="text-7xl">{newEmoji || "🎵"}</span>
                  <span className="text-lg font-semibold text-slate-700">
                    {newLabel || "명령 이름"}
                  </span>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewLabel("");
                    setNewEmoji("🎵");
                  }}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors active:scale-95"
                >
                  취소
                </button>
                <button
                  onClick={addCommand}
                  disabled={!newLabel.trim() || !newEmoji.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg active:scale-95"
                >
                  <Save className="w-5 h-5" />
                  추가하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 안내 카드 */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-100">
          <h3 className="font-bold text-slate-800 mb-2">💡 명령 사용 안내</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>• <strong>모든 명령</strong>을 삭제할 수 있으며, 삭제된 기본 명령은 초기화 시 복구됩니다</li>
            <li>• <strong>커스텀 명령</strong>은 자유롭게 추가/삭제할 수 있습니다</li>
            <li>• <strong>모든 사용자</strong>가 명령을 전송할 수 있습니다</li>
            <li>• 전송된 명령은 모든 세션 멤버에게 실시간으로 표시됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}