import type { PanelSide } from "@/store/deviceSettingsStore";

// 좌/우 패널 슬라이드 애니메이션 토큰 — 사이드바·명령패널이 동일한 모션을 공유한다.
export const PANEL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const panelTransition = { duration: 0.22, ease: PANEL_EASE };
export const panelContentTransition = { duration: 0.16, ease: PANEL_EASE };

// side별 슬라이드 x — 모바일은 화면 밖(±100%), 데스크톱 닫힘은 자기 가장자리 쪽 미세 이동(±12px).
export function getPanelSlideX(side: PanelSide, show: boolean, isMobile: boolean): number | string {
  if (show) return 0;
  if (isMobile) return side === "left" ? "-100%" : "100%";
  return side === "left" ? -12 : 12;
}

// side별 정적 규칙 묶음 — 사이드바·명령패널이 같은 물리 법칙을 공유한다.
// edgeClass: 모바일 오버레이가 붙는 가장자리. borderClass: 중앙 콘텐츠와 맞닿는 divider 방향.
// contentClosedX: 닫힘 시 내부 콘텐츠 x — 오른쪽 패널만 divider를 따라 미세 슬라이드,
// 왼쪽 패널은 0 (콘텐츠가 화면 끝에 고정이라 내부 translate가 parallax로 보임 → opacity만).
export function getPanelSideConfig(side: PanelSide): {
  edgeClass: string;
  borderClass: string;
  contentClosedX: number;
} {
  return side === "left"
    ? { edgeClass: "left-0", borderClass: "border-r", contentClosedX: 0 }
    : { edgeClass: "right-0", borderClass: "border-l", contentClosedX: 8 };
}
