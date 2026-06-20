import { useEffect, useState } from "react";
import { getSocket, setWorshipRoom } from "./useSocket";

interface UseWorshipRoomOptions {
  worshipId: string | undefined;
  profileId: string | null;
  currentSheetId: string | null;
}

// 예배 room 입장/퇴장 + 연결 상태 추적 + 현재 페이지 변경 알림.
// 싱글톤 소켓(useSocket)을 사용 — 재연결 시 room 자동 재입장 로직이 싱글톤에 묶여 있다.
export function useWorshipRoom({ worshipId, profileId, currentSheetId }: UseWorshipRoomOptions) {
  const socket = getSocket();

  // 예배 입장/퇴장
  useEffect(() => {
    if (!worshipId || !profileId) return;

    socket.emit("join:worship", { worshipId, profileId });
    setWorshipRoom({ worshipId, profileId });

    return () => {
      socket.emit("leave:worship", { worshipId });
      setWorshipRoom(null);
    };
  }, [worshipId, profileId, socket]);

  // 연결 상태 추적
  const [isConnected, setIsConnected] = useState(socket.connected);
  useEffect(() => {
    const onDisconnect = () => setIsConnected(false);
    const onConnect = () => setIsConnected(true);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);
    return () => {
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
    };
  }, [socket]);

  // 페이지 변경 알림
  useEffect(() => {
    if (!worshipId || !currentSheetId) return;
    socket.emit("page:change", { worshipId, sheetId: currentSheetId });
  }, [worshipId, currentSheetId, socket]);

  return { isConnected };
}
