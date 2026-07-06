import { useForm } from "react-hook-form";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useVerifyPin } from "@/hooks/queries/useAuth";

type PinFormValues = {
  pin: string;
};

export default function PinLock() {
  const verifyPin = useVerifyPin();

  const { register, handleSubmit, watch } = useForm<PinFormValues>({
    defaultValues: { pin: "" },
  });

  const pin = watch("pin");

  const onSubmit = handleSubmit(async (data) => {
    try {
      await verifyPin.mutateAsync(data.pin);
    } catch {
      // axios 인터셉터에서 toast 처리됨
    }
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <Card className="rounded-3xl w-full max-w-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">길튼 시스템</h1>
            <p className="text-muted-foreground">PIN을 입력해주세요</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              placeholder="PIN 입력"
              {...register("pin")}
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
