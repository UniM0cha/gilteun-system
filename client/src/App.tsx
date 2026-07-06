import { Outlet } from "react-router";
import { useAuthStatus } from "@/hooks/queries/useAuth";
import { useCommandsSync } from "@/hooks/useCommandsSync";
import PinLock from "@/pages/PinLock";

export default function App() {
  const { data: authStatus, isLoading } = useAuthStatus();
  // PIN 인증 게이트를 통과한 뒤에만 소켓 구독 시작 (인증 전 연결은 서버가 거부)
  useCommandsSync(!isLoading && !(authStatus?.required && !authStatus?.authenticated));

  if (isLoading) return null;
  if (authStatus?.required && !authStatus?.authenticated) return <PinLock />;

  return <Outlet />;
}
