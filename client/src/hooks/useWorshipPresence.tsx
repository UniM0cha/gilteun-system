import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getSocket } from "./useSocket";
import type { PresenceUser } from "@/types";
import CommandToast from "@/components/worship/CommandToast";
import SpotlightToast from "@/components/worship/SpotlightToast";

interface UseWorshipPresenceOptions {
  worshipId: string | undefined;
  onSpotlightAccept: (sheetId: string) => void;
}

// 접속자 현황(presence) + 명령(command) / 호출(spotlight) 토스트 수신.
export function useWorshipPresence({ worshipId, onSpotlightAccept }: UseWorshipPresenceOptions) {
  const socket = getSocket();
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  // spotlight accept 콜백을 ref로 우회 — effect deps는 [worshipId, socket]이므로
  // 콜백(commitSheetId)이 매 렌더 새로 만들어져도 재구독 없이 항상 최신 값을 호출.
  const onSpotlightAcceptRef = useRef(onSpotlightAccept);
  onSpotlightAcceptRef.current = onSpotlightAccept;

  useEffect(() => {
    const handlePresence = (data: { worshipId: string; users: PresenceUser[] }) => {
      if (data.worshipId === worshipId) {
        // 중복 프로필 제거
        const seen = new Set<string>();
        const unique = data.users.filter((u) => {
          if (seen.has(u.profileId)) return false;
          seen.add(u.profileId);
          return true;
        });
        setPresenceUsers(unique);
      }
    };

    const handleCommand = (data: {
      commandId: string;
      emoji: string;
      label: string;
      senderName: string;
      senderRole: string;
      senderRoleIcon: string;
    }) => {
      const toastId = `command-${Date.now()}`;
      toast.custom(
        () => (
          <CommandToast
            emoji={data.emoji}
            label={data.label}
            senderName={data.senderName}
            senderRoleIcon={data.senderRoleIcon}
            onDismiss={() => toast.dismiss(toastId)}
          />
        ),
        { duration: 3000, position: "top-center", id: toastId },
      );
    };

    const handleSpotlight = (data: { sheetId: string; sheetTitle: string; senderName: string; senderRole: string }) => {
      const toastId = `spotlight-${Date.now()}`;
      toast.custom(
        () => (
          <SpotlightToast
            senderName={data.senderName}
            sheetTitle={data.sheetTitle}
            onAccept={() => {
              onSpotlightAcceptRef.current(data.sheetId);
              toast.dismiss(toastId);
            }}
          />
        ),
        { duration: 10000, position: "top-center", id: toastId },
      );
    };

    socket.on("presence:update", handlePresence);
    socket.on("command:received", handleCommand);
    socket.on("page:spotlight", handleSpotlight);

    return () => {
      socket.off("presence:update", handlePresence);
      socket.off("command:received", handleCommand);
      socket.off("page:spotlight", handleSpotlight);
    };
  }, [worshipId, socket]);

  return { presenceUsers };
}
