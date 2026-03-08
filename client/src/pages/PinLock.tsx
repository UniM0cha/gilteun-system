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
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
      <Card className="rounded-3xl w-full max-w-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-slate-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">길튼 시스템</h1>
            <p className="text-slate-500">PIN을 입력해주세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              placeholder="PIN 입력"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-2xl tracking-widest h-14 rounded-xl"
              autoFocus
            />
            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-lg font-semibold"
              disabled={!pin || verifyPin.isPending}
            >
              {verifyPin.isPending ? "확인 중..." : "입장"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
