// 좌/우 패널 슬라이드 애니메이션 토큰 — 사이드바·명령패널이 동일한 모션을 공유한다.
export const PANEL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const panelTransition = { duration: 0.22, ease: PANEL_EASE };
export const panelContentTransition = { duration: 0.16, ease: PANEL_EASE };
