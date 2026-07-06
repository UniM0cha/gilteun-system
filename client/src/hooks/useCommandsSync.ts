import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "./useSocket";
import { queryKeys } from "@/lib/queryKeys";

// 명령(commands)은 전역 리소스 — 예배 화면뿐 아니라 명령 설정 화면 등
// useCommands()를 쓰는 모든 화면이 최신을 유지하도록 앱 루트에서 1회 구독한다.
// enabled: PIN 인증 완료 전에는 소켓을 만들지 말 것 — 쿠키 없이 연결하면 서버
// 미들웨어가 거부하고, 거부된 소켓은 자동 재연결하지 않아 인증 후에도 죽은 채 남는다.
export function useCommandsSync(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    // 이전에 인증 거부로 끊긴 싱글톤이 남아 있어도 되살린다
    if (!socket.connected) socket.connect();

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: queryKeys.commands.all });
    };

    // 서버 브로드캐스트 수신 + 재연결 시 끊긴 동안 놓친 변경 재검증
    socket.on("commands:updated", invalidate);
    socket.on("connect", invalidate);

    return () => {
      socket.off("commands:updated", invalidate);
      socket.off("connect", invalidate);
      // 인증 해제(enabled → false)·앱 종료 시 인증된 연결을 남기지 않는다 —
      // Socket.IO 인증은 handshake에서만 검사하므로 끊지 않으면 로그아웃 후에도 유효한 연결로 남음.
      // enabled가 다시 true가 되면 위의 connect()가 되살린다.
      socket.disconnect();
    };
  }, [enabled, qc]);
}
