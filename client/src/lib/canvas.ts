import type { Point } from "@/hooks/useDrawingSync";

// 그리기/정규화의 단일 좌표계 기준이 되는 CSS-space content rect.
// canvas backing store(DPR배 픽셀)가 아니라 레이아웃 크기(offsetWidth/Height) 기준으로만 계산해야
// 좌표·굵기가 일치한다 — 자세한 불변식은 client/CLAUDE.md 참고.
export interface ContentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 정규화 좌표 → 화면 좌표
export function denormalizePoint(p: Point, rect: ContentRect): { x: number; y: number } {
  return { x: rect.x + p.x * rect.width, y: rect.y + p.y * rect.height };
}

// 화면 좌표 → 정규화 좌표
export function normalizePoint(x: number, y: number, rect: ContentRect): Point {
  return { x: (x - rect.x) / rect.width, y: (y - rect.y) / rect.height };
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// 주어진 크기를 좌상단 원점의 content rect로 만든다 — 그리기 영역의 좌표계 기준을 한 곳에 모은다.
// 두 size source가 공존한다(client/CLAUDE.md 불변식): redraw/굵기용은 offsetWidth(줌 무관, getCanvasContentRect),
// pointer 정규화용은 getBoundingClientRect().width(줌 보정). 둘 다 이 helper로 동일한 형태의 rect를 만든다.
export function fullRect(width: number, height: number): ContentRect {
  return { x: 0, y: 0, width, height };
}

// 그리기/정규화의 기준이 되는 CSS-space content rect = 캔버스(흰 카드) 전체.
// 좌표·굵기 계산은 모두 CSS px 기준이어야 하므로 backing store 픽셀(canvas.width, DPR배)이 아닌
// 레이아웃 크기(offsetWidth/Height)를 단일 기준으로 고정한다. 카드가 3:4로 고정돼 있어, 이미지 영역이
// 아니라 캔버스 전체를 기준으로 삼아도 X/Y 정규화 스케일이 같은 비율이라 획 모양이 왜곡되지 않는다.
// (악보 이미지는 별도로 CSS object-contain이 비율을 유지하므로 영향 없음.)
// 한 call site라도 canvas.width로 되돌아가면 DPR배 오차가 나므로 helper로 묶어 불변식을 강제한다.
export function getCanvasContentRect(canvas: HTMLCanvasElement): ContentRect {
  return fullRect(canvas.offsetWidth, canvas.offsetHeight);
}

// backing store를 CSS 레이아웃 크기 × DPR로 동기화 (실제로 다를 때만 — 재설정 시 canvas가 클리어됨).
// 사용한 dpr을 반환 — 호출부가 ctx.setTransform(dpr,…)로 좌표계를 CSS px로 통일한다.
// ResizeObserver 경로와 redraw 경로가 같은 계산을 쓰도록 한곳에 모은다.
export function syncCanvasBackingStore(canvas: HTMLCanvasElement): number {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight;
  const bufW = Math.round(cssW * dpr);
  const bufH = Math.round(cssH * dpr);
  if (cssW > 0 && cssH > 0 && (canvas.width !== bufW || canvas.height !== bufH)) {
    canvas.width = bufW;
    canvas.height = bufH;
  }
  return dpr;
}

export function distanceToSegment(
  point: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (dx === 0 && dy === 0) {
    const pdx = point.x - p1.x;
    const pdy = point.y - p1.y;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  }
  const t = Math.max(0, Math.min(1, ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy)));
  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;
  const pdx = point.x - projX;
  const pdy = point.y - projY;
  return Math.sqrt(pdx * pdx + pdy * pdy);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
