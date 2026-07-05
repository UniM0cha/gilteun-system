import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelSide = "left" | "right";

// 기기별(로컬) 설정 — 서버에 저장되지 않고 이 기기의 localStorage에만 남는다.
// 악보 목록 위치는 항상 명령 패널의 반대편으로 파생되므로 별도 필드를 두지 않는다.
interface DeviceSettingsState {
  commandPanelSide: PanelSide;
  setCommandPanelSide: (side: PanelSide) => void;
}

export const useDeviceSettingsStore = create<DeviceSettingsState>()(
  persist(
    (set) => ({
      commandPanelSide: "right",
      setCommandPanelSide: (side) => set({ commandPanelSide: side }),
    }),
    {
      name: "gilteun-device-settings",
      partialize: (state) => ({ commandPanelSide: state.commandPanelSide }),
      // localStorage가 손상돼 "left"/"right" 외 값이 복원되면 토글 버튼 렌더 조건이
      // 양쪽 다 불일치해 버튼이 사라진다 — 검증해서 초기 상태(current)의 기본값으로 되돌린다.
      merge: (persisted, current) => {
        const side = (persisted as Partial<DeviceSettingsState> | undefined)?.commandPanelSide;
        return {
          ...current,
          commandPanelSide: side === "left" || side === "right" ? side : current.commandPanelSide,
        };
      },
    },
  ),
);
