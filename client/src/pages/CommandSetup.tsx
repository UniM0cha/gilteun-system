import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Plus, Trash2, RotateCcw, Save, Settings } from "lucide-react";
import { useCommands, useAddCommand, useDeleteCommand, useResetCommands } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function CommandSetup() {
  const { data: commands = [] } = useCommands();
  const addCommandMutation = useAddCommand();
  const deleteCommandMutation = useDeleteCommand();
  const resetCommandsMutation = useResetCommands();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmoji, setNewEmoji] = useState("🎵");
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = async () => {
    if (newLabel.trim()) {
      await addCommandMutation.mutateAsync({ emoji: newEmoji, label: newLabel.trim() });
      setNewLabel("");
      setNewEmoji("🎵");
      setDialogOpen(false);
    }
  };

  const resetForm = () => {
    setNewLabel("");
    setNewEmoji("🎵");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">명령 설정</h1>
            <p className="text-slate-600">예배 중 사용할 명령을 관리하세요</p>
          </div>
          <ConfirmDialog
            trigger={
              <Button variant="secondary" className="bg-orange-50 text-orange-600 hover:bg-orange-100">
                <RotateCcw className="w-5 h-5" />
                초기화
              </Button>
            }
            title="명령 초기화"
            description="기본 명령으로 초기화하시겠습니까?"
            confirmLabel="초기화"
            onConfirm={() => resetCommandsMutation.mutate()}
            destructive
          />
        </div>

        {/* 명령 그리드 */}
        <Card className="mb-6 rounded-3xl p-8">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">현재 명령 ({commands.length})</h2>
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-5 h-5" />새 명령 추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">새 명령 추가</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">이모티콘 *</label>
                      <Input
                        type="text"
                        value={newEmoji}
                        onChange={(e) => setNewEmoji(e.target.value)}
                        className="text-3xl text-center"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">명령 이름 *</label>
                      <Input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="예: 후렴구, 다같이 등"
                        className="text-lg"
                      />
                    </div>
                    <div className="p-6 bg-linear-to-br from-slate-50 to-slate-100 rounded-2xl">
                      <div className="text-sm font-semibold text-slate-600 mb-3 text-center">미리보기</div>
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-7xl">{newEmoji || "🎵"}</span>
                        <span className="text-lg font-semibold text-slate-700">{newLabel || "명령 이름"}</span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="secondary">취소</Button>
                    </DialogClose>
                    <Button onClick={handleAdd} disabled={!newLabel.trim() || !newEmoji.trim()}>
                      <Save className="w-5 h-5" />
                      추가하기
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {commands.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {commands.map((command) => (
                  <Card
                    key={command.id}
                    className="bg-linear-to-br from-slate-50 to-slate-100 rounded-2xl p-6 shadow-md border-2 border-transparent"
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col items-center gap-3 mb-3">
                        <span className="text-6xl">{command.emoji}</span>
                        <span className="text-sm font-semibold text-slate-700 text-center">{command.label}</span>
                        {command.isDefault && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">
                            기본 명령
                          </span>
                        )}
                      </div>
                      <ConfirmDialog
                        trigger={
                          <Button variant="destructive" className="w-full border-2 border-red-200">
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm font-semibold">삭제</span>
                          </Button>
                        }
                        title="명령 삭제"
                        description={`"${command.label}" 명령을 삭제하시겠습니까?`}
                        confirmLabel="삭제"
                        onConfirm={() => deleteCommandMutation.mutate(command.id)}
                        destructive
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">아직 명령이 없습니다</h3>
                <p className="text-slate-500 mb-6">새 명령을 추가하거나 초기화 버튼으로 기본 명령을 불러오세요</p>
                <div className="flex items-center justify-center gap-3">
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-5 h-5" />새 명령 추가
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-orange-50 text-orange-600 hover:bg-orange-100"
                    onClick={() => resetCommandsMutation.mutate()}
                  >
                    <RotateCcw className="w-5 h-5" />
                    기본 명령 초기화
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 안내 */}
        <div className="bg-linear-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-100">
          <h3 className="font-bold text-slate-800 mb-2">명령 사용 안내</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>- 모든 명령을 삭제할 수 있으며, 삭제된 기본 명령은 초기화 시 복구됩니다</li>
            <li>- 커스텀 명령은 자유롭게 추가/삭제할 수 있습니다</li>
            <li>- 전송된 명령은 모든 세션 멤버에게 실시간으로 표시됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
