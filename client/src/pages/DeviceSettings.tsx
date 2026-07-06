import { Link } from "react-router";
import { ArrowLeft, PanelLeft, PanelRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDeviceSettingsStore, type PanelSide } from "@/store/deviceSettingsStore";

// 패널 위치 선택지 — 화면상 배치와 카드 순서를 일치시킨다 (왼쪽 옵션이 왼쪽 칸)
const panelSideOptions: { side: PanelSide; icon: LucideIcon; title: string; description: string }[] = [
  { side: "left", icon: PanelLeft, title: "명령 패널 왼쪽", description: "악보 목록은 오른쪽" },
  { side: "right", icon: PanelRight, title: "명령 패널 오른쪽 (기본)", description: "악보 목록은 왼쪽" },
];

// 기기별 설정 — 서버가 아닌 이 기기의 localStorage에만 저장된다 (선택 즉시 반영, 저장 버튼 없음)
export default function DeviceSettings() {
  const commandPanelSide = useDeviceSettingsStore((s) => s.commandPanelSide);
  const setCommandPanelSide = useDeviceSettingsStore((s) => s.setCommandPanelSide);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">기기 설정</h1>
            <p className="text-muted-foreground">이 설정은 이 기기에만 저장됩니다</p>
          </div>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-8">
            <h2 className="text-xl font-bold text-foreground mb-1">패널 위치</h2>
            <p className="text-muted-foreground mb-6">예배 화면에서 악보 목록과 명령 패널의 좌우 위치를 바꿉니다</p>
            <div className="grid grid-cols-2 gap-4">
              {panelSideOptions.map(({ side, icon: Icon, title, description }) => {
                const selected = commandPanelSide === side;
                return (
                  <button
                    key={side}
                    aria-pressed={selected}
                    onClick={() => setCommandPanelSide(side)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-8 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer",
                      selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <Icon className={cn("w-10 h-10", selected ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-center">
                      <div className="font-bold text-foreground">{title}</div>
                      <div className="text-sm text-muted-foreground">{description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
