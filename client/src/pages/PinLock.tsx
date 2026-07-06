import { SubmitEvent, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useVerifyPin } from "@/hooks/queries/useAuth";

export default function PinLock() {
  const [pin, setPin] = useState("");
  const verifyPin = useVerifyPin();

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await verifyPin.mutateAsync(pin);
    } catch {
      // axios 인터셉터에서 toast 처리됨
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-sm">
        <CardContent>
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
              <Lock className="size-6 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">길튼 시스템</h1>
            <p className="text-muted-foreground">PIN을 입력해주세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              placeholder="PIN 입력"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="h-11 text-center text-xl tracking-widest"
              autoFocus
            />
            <Button type="submit" size="lg" className="h-11 w-full" disabled={!pin || verifyPin.isPending}>
              {verifyPin.isPending ? "확인 중..." : "입장"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
