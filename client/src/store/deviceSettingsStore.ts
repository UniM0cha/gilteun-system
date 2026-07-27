import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelSide = "left" | "right";

// 펜으로만 그리기(팜 리젝션) 모드.
// "auto" = 사용자가 아직 정하지 않음 → 스타일러스가 감지되면 켜진다.
// 사용자가 한 번이라도 토글하면 "on"/"off"로 고정되어 자동 감지가 그 선택을 덮지 않는다.
// (불리언 하나로는 "펜을 써본 적 없는 사용자가 미리 꺼둔 경우"를 표현할 수 없어 3-state로 둔다)
export type PenOnlyMode = "auto" | "on" | "off";

// 기기별(로컬) 설정 — 서버에 저장되지 않고 이 기기의 localStorage에만 남는다.
// 악보 목록 위치는 항상 명령 패널의 반대편으로 파생되므로 별도 필드를 두지 않는다.
export interface DeviceSettingsState {
  commandPanelSide: PanelSide;
  penOnlyMode: PenOnlyMode;
  penDetected: boolean;
  setCommandPanelSide: (side: PanelSide) => void;
  setPenOnly: (on: boolean) => void;
  // 스타일러스 최초 감지 기록. 반환값 = "이번 호출로 펜 전용이 켜졌는가"(1회 안내 토스트용).
  notePenDetected: () => boolean;
}

// 펜으로만 그리기가 실제로 적용 중인지 — 사용자 선택(on/off)이 우선, 미선택이면 감지 여부를 따른다.
export const selectPenOnlyActive = (s: DeviceSettingsState) =>
  s.penOnlyMode === "on" || (s.penOnlyMode === "auto" && s.penDetected);

export const useDeviceSettingsStore = create<DeviceSettingsState>()(
  persist(
    (set, get) => ({
      commandPanelSide: "right",
      penOnlyMode: "auto",
      penDetected: false,
      setCommandPanelSide: (side) => set({ commandPanelSide: side }),
      setPenOnly: (on) => set({ penOnlyMode: on ? "on" : "off" }),
      notePenDetected: () => {
        if (get().penDetected) return false;
        // "auto"였다면 이 기록으로 펜 전용이 켜진다 — 그 사실을 호출자에게 알려 토스트를 1회만 띄운다.
        const turnedOn = get().penOnlyMode === "auto";
        set({ penDetected: true });
        return turnedOn;
      },
    }),
    {
      name: "gilteun-device-settings",
      partialize: (state) => ({
        commandPanelSide: state.commandPanelSide,
        penOnlyMode: state.penOnlyMode,
        penDetected: state.penDetected,
      }),
      // localStorage가 손상돼 정의되지 않은 값이 복원되면 UI가 조용히 깨진다 —
      // commandPanelSide는 토글 버튼 렌더 조건이 양쪽 다 불일치해 버튼이 사라지고,
      // penOnlyMode는 selectPenOnlyActive가 영구히 false가 되어 펜슬 사용자가
      // 이유도 모른 채 팜 리젝션을 못 받는다. 검증해서 초기 상태(current)의 기본값으로 되돌린다.
      merge: (persisted, current) => {
        const p = persisted as Partial<DeviceSettingsState> | undefined;
        const side = p?.commandPanelSide;
        const mode = p?.penOnlyMode;
        return {
          ...current,
          commandPanelSide: side === "left" || side === "right" ? side : current.commandPanelSide,
          penOnlyMode: mode === "auto" || mode === "on" || mode === "off" ? mode : current.penOnlyMode,
          penDetected: typeof p?.penDetected === "boolean" ? p.penDetected : current.penDetected,
        };
      },
    },
  ),
);
