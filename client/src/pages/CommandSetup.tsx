import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { ArrowLeft, Plus, Trash2, RotateCcw, Save, Settings } from "lucide-react";
import { useCommands, useAddCommand, useDeleteCommand, useResetCommands } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { EmptyState } from "@/components/EmptyState";

type CommandFormValues = {
  emoji: string;
  label: string;
};

export default function CommandSetup() {
  const { data: commands = [] } = useCommands();
  const addCommandMutation = useAddCommand();
  const deleteCommandMutation = useDeleteCommand();
  const resetCommandsMutation = useResetCommands();

  const [dialogOpen, setDialogOpen] = useState(false);

  const { register, handleSubmit, reset, watch } = useForm<CommandFormValues>({
    defaultValues: { emoji: "🎵", label: "" },
  });

  const newEmoji = watch("emoji");
  const newLabel = watch("label");

  const handleAdd = handleSubmit(async (data) => {
    if (!data.label.trim()) return;
    await addCommandMutation.mutateAsync({ emoji: data.emoji, label: data.label.trim() });
    reset();
    setDialogOpen(false);
  });

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            title="홈으로"
            aria-label="홈으로"
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-11")}
          >
            <ArrowLeft />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">명령 설정</h1>
            <p className="text-muted-foreground">예배 중 사용할 명령을 관리하세요</p>
          </div>
          <ConfirmDialog
            trigger={
              <Button variant="outline" className="h-11">
                <RotateCcw />
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">현재 명령 ({commands.length})</CardTitle>
            <CardAction>
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) reset();
                }}
              >
                <DialogTrigger render={<Button className="h-11" />}>
                  <Plus />새 명령 추가
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>새 명령 추가</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="command-emoji" className="mb-2">
                        이모티콘 *
                      </Label>
                      <Input
                        id="command-emoji"
                        type="text"
                        {...register("emoji")}
                        className="h-11 text-center text-2xl"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="command-label" className="mb-2">
                        명령 이름 *
                      </Label>
                      <Input
                        id="command-label"
                        type="text"
                        {...register("label")}
                        placeholder="예: 후렴구, 다같이 등"
                        className="h-11"
                      />
                    </div>
                    <div className="rounded-lg border bg-muted/50 p-6">
                      <div className="mb-3 text-center text-sm font-medium text-muted-foreground">미리보기</div>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-6xl">{newEmoji || "🎵"}</span>
                        <span className="font-medium">{newLabel || "명령 이름"}</span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" className="h-11" />}>취소</DialogClose>
                    <Button className="h-11" onClick={handleAdd} disabled={!newLabel.trim() || !newEmoji.trim()}>
                      <Save />
                      추가하기
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardAction>
          </CardHeader>
          <CardContent>
            {commands.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {commands.map((command) => (
                  <div key={command.id} className="flex flex-col rounded-lg border p-4">
                    <div className="mb-3 flex flex-col items-center gap-2">
                      <span className="text-5xl">{command.emoji}</span>
                      <span className="text-center text-sm font-medium">{command.label}</span>
                      {command.isDefault && <Badge variant="secondary">기본 명령</Badge>}
                    </div>
                    <ConfirmDialog
                      trigger={
                        <Button variant="outline" className="mt-auto h-11 w-full">
                          <Trash2 />
                          삭제
                        </Button>
                      }
                      title="명령 삭제"
                      description={`"${command.label}" 명령을 삭제하시겠습니까?`}
                      confirmLabel="삭제"
                      onConfirm={() => deleteCommandMutation.mutate(command.id)}
                      destructive
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Settings}
                title="아직 명령이 없습니다"
                description="새 명령을 추가하거나 초기화 버튼으로 기본 명령을 불러오세요"
                action={
                  <div className="flex items-center justify-center gap-3">
                    <Button className="h-11" onClick={() => setDialogOpen(true)}>
                      <Plus />새 명령 추가
                    </Button>
                    <Button variant="outline" className="h-11" onClick={() => resetCommandsMutation.mutate()}>
                      <RotateCcw />
                      기본 명령 초기화
                    </Button>
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* 안내 */}
        <Alert>
          <Settings />
          <AlertTitle>명령 사용 안내</AlertTitle>
          <AlertDescription>
            <ul className="space-y-1">
              <li>- 모든 명령을 삭제할 수 있으며, 삭제된 기본 명령은 초기화 시 복구됩니다</li>
              <li>- 커스텀 명령은 자유롭게 추가/삭제할 수 있습니다</li>
              <li>- 전송된 명령은 모든 세션 멤버에게 실시간으로 표시됩니다</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
