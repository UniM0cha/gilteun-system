import { Outlet } from "react-router";
import { useAuthStatus } from "@/hooks/queries/useAuth";
import PinLock from "@/pages/PinLock";

export default function App() {
  const { data: authStatus, isLoading } = useAuthStatus();

  if (isLoading) return null;
  if (authStatus?.required && !authStatus?.authenticated) return <PinLock />;

  return <Outlet />;
}
