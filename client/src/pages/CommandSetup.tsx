import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, GripVertical, Plus, RotateCcw, Save, Settings, Trash2 } from "lucide-react";
import {
  useAddCommand,
  useCommands,
  useDeleteCommand,
  useProfileCommandOrder,
  useReorderCommands,
  useResetCommands,
  useResetProfileCommandOrder,
  useProfiles,
} from "@/hooks/queries";
import type { Command } from "@/types";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";

type CommandFormValues = {
  emoji: string;
  label: string;
};

interface SortableCommandCardProps {
  command: Command;
  canManageCatalog: boolean;
  disabled: boolean;
  onDelete: (id: string) => void;
}

function SortableCommandCard({ command, canManageCatalog, disabled, onDelete }: SortableCommandCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: command.id,
    disabled,
  });

  return (
    <Card
      ref={setNodeRef}
      size="sm"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("h-full", isDragging && "opacity-50")}
    >
      <CardContent className="flex flex-1 flex-col items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="touch-none self-end cursor-grab active:cursor-grabbing"
          disabled={disabled}
          title={`${command.label} 순서 이동`}
          aria-label={`${command.label} 순서 이동`}
          {...attributes}
          {...listeners}
        >
          <GripVertical />
        </Button>
        <span className="text-5xl" aria-hidden="true">
          {command.emoji}
        </span>
        <span className="text-center text-sm font-medium">{command.label}</span>
        {command.isDefault && <Badge variant="secondary">기본 명령</Badge>}
      </CardContent>
      {canManageCatalog && (
        <CardFooter>
          <ConfirmDialog
            trigger={
              <Button variant="outline" className="h-11 w-full">
                <Trash2 data-icon="inline-start" />
                삭제
              </Button>
            }
            title="명령 삭제"
            description={`"${command.label}" 명령을 모든 프로필에서 삭제하시겠습니까?`}
            confirmLabel="삭제"
            onConfirm={() => onDelete(command.id)}
            destructive
          />
        </CardFooter>
      )}
    </Card>
  );
}

export default function CommandSetup() {
  const [scope, setScope] = useState("default");
  const profileId = scope === "default" ? undefined : scope;
  const canManageCatalog = !profileId;
  const { data: profiles = [] } = useProfiles();
  const { data: commands = [] } = useCommands(profileId);
  const { data: profileOrder } = useProfileCommandOrder(profileId);
  const addCommandMutation = useAddCommand();
  const deleteCommandMutation = useDeleteCommand();
  const resetCommandsMutation = useResetCommands();
  const reorderCommandsMutation = useReorderCommands();
  const resetProfileOrderMutation = useResetProfileCommandOrder();

  const [orderedCommands, setOrderedCommands] = useState<Command[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setOrderedCommands(commands);
  }, [commands]);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = orderedCommands.findIndex((command) => command.id === active.id);
    const newIndex = orderedCommands.findIndex((command) => command.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = orderedCommands;
    const next = arrayMove(previous, oldIndex, newIndex);
    setOrderedCommands(next);
    try {
      await reorderCommandsMutation.mutateAsync({
        orderedIds: next.map((command) => command.id),
        profileId,
      });
    } catch {
      setOrderedCommands(previous);
    }
  };

  const selectedProfile = profiles.find((profile) => profile.id === profileId);
  const isSavingOrder = reorderCommandsMutation.isPending || resetProfileOrderMutation.isPending;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-4">
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
            <p className="text-muted-foreground">명령 목록과 프로필별 표시 순서를 관리하세요</p>
          </div>
          {canManageCatalog ? (
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="h-11">
                  <RotateCcw data-icon="inline-start" />
                  명령 초기화
                </Button>
              }
              title="명령 초기화"
              description="기본 명령으로 다시 만들고 모든 프로필의 개인 순서도 삭제하시겠습니까?"
              confirmLabel="초기화"
              onConfirm={() => resetCommandsMutation.mutate()}
              destructive
            />
          ) : (
            <Button
              variant="outline"
              className="h-11"
              disabled={profileOrder?.usesDefault !== false || isSavingOrder}
              onClick={() => profileId && resetProfileOrderMutation.mutate(profileId)}
            >
              <RotateCcw data-icon="inline-start" />
              기본 순서 사용
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>정렬 대상</CardTitle>
            <CardDescription>전체 기본 순서 또는 순서를 따로 사용할 프로필을 선택하세요.</CardDescription>
            <CardAction>
              {profileId && (
                <Badge variant={profileOrder?.usesDefault === false ? "default" : "secondary"}>
                  {profileOrder?.usesDefault === false ? "개인 순서" : "전체 기본 사용 중"}
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardContent>
            <Select value={scope} onValueChange={(value) => value && setScope(value)}>
              <SelectTrigger className="h-11 w-full sm:max-w-sm" aria-label="명령 정렬 대상">
                <SelectValue>{scope === "default" ? "전체 기본 순서" : (selectedProfile?.name ?? "")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="default">전체 기본 순서</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>현재 명령 ({orderedCommands.length})</CardTitle>
            <CardDescription>
              {profileId
                ? `${selectedProfile?.name ?? "선택한 프로필"}에게 보일 순서입니다. 드래그하면 개인 순서로 저장됩니다.`
                : "모든 프로필이 기본으로 사용할 순서입니다. 명령의 내용도 여기서 관리합니다."}
            </CardDescription>
            {canManageCatalog && (
              <CardAction>
                <Dialog
                  open={dialogOpen}
                  onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) reset();
                  }}
                >
                  <DialogTrigger render={<Button className="h-11" />}>
                    <Plus data-icon="inline-start" />새 명령 추가
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>새 명령 추가</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-6">
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
                      <Card size="sm">
                        <CardHeader>
                          <CardTitle className="text-center">미리보기</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-2">
                          <span className="text-6xl">{newEmoji || "🎵"}</span>
                          <span className="font-medium">{newLabel || "명령 이름"}</span>
                        </CardContent>
                      </Card>
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" className="h-11" />}>취소</DialogClose>
                      <Button className="h-11" onClick={handleAdd} disabled={!newLabel.trim() || !newEmoji.trim()}>
                        <Save data-icon="inline-start" />
                        추가하기
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {orderedCommands.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedCommands.map((command) => command.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {orderedCommands.map((command) => (
                      <SortableCommandCard
                        key={command.id}
                        command={command}
                        canManageCatalog={canManageCatalog}
                        disabled={isSavingOrder}
                        onDelete={(id) => deleteCommandMutation.mutate(id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <EmptyState
                icon={Settings}
                title="아직 명령이 없습니다"
                description={
                  canManageCatalog
                    ? "새 명령을 추가하거나 초기화하여 기본 명령을 불러오세요"
                    : "전체 기본 순서에서 먼저 명령을 추가하세요"
                }
                action={
                  canManageCatalog ? (
                    <div className="flex items-center justify-center gap-3">
                      <Button className="h-11" onClick={() => setDialogOpen(true)}>
                        <Plus data-icon="inline-start" />새 명령 추가
                      </Button>
                      <Button variant="outline" className="h-11" onClick={() => resetCommandsMutation.mutate()}>
                        <RotateCcw data-icon="inline-start" />
                        기본 명령 초기화
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            )}
          </CardContent>
        </Card>

        <Alert>
          <Settings />
          <AlertTitle>명령 사용 안내</AlertTitle>
          <AlertDescription>
            {profileId
              ? "개인 순서를 만들지 않은 프로필은 전체 기본 순서를 따릅니다. 새로 추가된 명령은 개인 순서의 마지막에 표시됩니다."
              : "명령 추가와 삭제는 모든 프로필에 적용됩니다. 기본 순서를 바꾸면 개인 순서가 없는 프로필에 즉시 반영됩니다."}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
